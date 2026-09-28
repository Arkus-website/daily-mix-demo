"""review-gate: run the five checks against the approved plan and post the verdicts.

Routing (worksheet, Decision 3):
  Red    = check 1, 2 or 5 FAIL            -> back to the plan owner
  Yellow = check 3 or 4 FAIL, or any UNKNOWN -> return for evidence
  Green  = all PASS                        -> eligible for a focused human review
Red over Yellow over Green. Exit code is non-zero unless Green, so a required status check holds the merge.

Backends (REVIEW_BACKEND): "api" (default, the Anthropic SDK, ANTHROPIC_API_KEY) for Actions;
"cli" (the `claude` command, your Claude Code login) for local dry runs. Neither sets a temperature:
the current SDK rejects the argument for this model family, so verdict stability comes from running twice.
"""
import json, os, pathlib, re, sys
from common import *

base_sha = os.environ["BASE_SHA"]; head_sha = os.environ["HEAD_SHA"]; head_ref = os.environ["HEAD_REF"]
base_ref = os.environ["BASE_REF"]; pr = int(os.environ["PR_NUMBER"])
model = os.environ.get("REVIEW_MODEL", "claude-sonnet-5")
backend = os.environ.get("REVIEW_BACKEND", "api")
MARKER = "<!-- review-gate -->"
HERE = pathlib.Path(__file__).parent
ROOT = repo_root()

files = changed_files(base_sha, head_sha)
if only_touches_plans(files):
    summary("**review-gate** · plan PR; nothing to review here."); sys.exit(0)

# (A) plan, from the base branch (the approved one, not whatever the PR branch says)
path = resolve_plan_path(os.environ.get("PR_BODY", ""), head_ref)
plan = load_plan(path, base_ref)
if not plan.strip():
    body = f"### Review gate · RED\n\nNo approved plan at `{path}` on `{base_ref}`; the five checks need one. See plan-gate."
    upsert_comment(pr, MARKER, body); summary(body); sys.exit(1)

# (B) diff + full content of touched files, read at the PR head so the working tree does not matter
diff = sh("git", "diff", f"{base_sha}...{head_sha}")
touched = []
for f in files:
    content = file_at(head_sha, f)
    if content is None:
        touched.append(f"<file path=\"{f}\" note=\"deleted in this PR; diff only\"/>")
    elif len(content) > 80_000:
        touched.append(f"<file path=\"{f}\" note=\"too large; diff only\"/>")
    else:
        touched.append(f"<file path=\"{f}\">\n{content}\n</file>")

# (C) CI output, captured by the ci job
ci_log = pathlib.Path(os.environ.get("CI_LOG") or (ROOT / "ci-output" / "ci-output.txt"))
ci = ci_log.read_text(errors="replace")[-60_000:] if ci_log.exists() else "NO CI OUTPUT CAPTURED"
ci_status = os.environ.get("CI_RESULT", "unknown")

# (D) contract docs, if the repo keeps them
docs = ""
contracts = ROOT / "docs" / "contracts"
for d in sorted(contracts.glob("*.md")) if contracts.exists() else []:
    docs += f"<doc path=\"{d.relative_to(ROOT)}\">\n{d.read_text(errors='replace')}\n</doc>\n"

user = f"""<A plan="{path}">
{plan}
</A>

<B changed_files="{len(files)}">
<diff>
{diff}
</diff>
{chr(10).join(touched)}
</B>

<C ci_result="{ci_status}">
{ci}
</C>

<D>
{docs or 'No contract documentation provided.'}
</D>
"""
system = (HERE / "PROMPT.md").read_text()
if backend == "api" and not os.environ.get("ANTHROPIC_API_KEY"):
    body = "### Review gate · YELLOW\n\nNo `ANTHROPIC_API_KEY` secret is configured, so the five checks did not run. Add the secret and re-run. Nothing here is evidence."
    upsert_comment(pr, MARKER, body); summary(body); sys.exit(1)
save_output(f"pr{pr}-input.txt", user)

FINDING = {"type": "object", "additionalProperties": False,
           "required": ["file", "line", "label", "note"],
           "properties": {"file": {"type": "string"}, "line": {"type": "integer"},
                          "label": {"type": "string", "enum": ["OBSERVED", "DOCUMENTED", "ASSUMED"]},
                          "note": {"type": "string"}}}
CHECK = {"type": "object", "additionalProperties": False,
         "required": ["id", "name", "verdict", "findings", "summary"],
         "properties": {"id": {"type": "integer", "enum": [1, 2, 3, 4, 5]}, "name": {"type": "string"},
                        "verdict": {"type": "string", "enum": ["PASS", "FAIL", "UNKNOWN"]},
                        "findings": {"type": "array", "items": FINDING},
                        "summary": {"type": "string"}}}
# The API does not support minItems above 1, so the five checks are five required
# properties instead of an array. The parser below accepts both shapes.
SCHEMA = {"type": "object", "additionalProperties": False,
          "required": ["check_1", "check_2", "check_3", "check_4", "check_5", "missing_evidence"],
          "properties": {**{f"check_{i}": CHECK for i in range(1, 6)},
                         "missing_evidence": {"type": "array", "items": {"type": "string"}}}}

def ask(system: str, user: str) -> str:
    if backend == "cli":
        out = sh("claude", "-p", "--model", model, "--system-prompt", system,
                 "--output-format", "json", "--tools", "", "--no-session-persistence", input=user)
        return json.loads(out)["result"]
    import anthropic
    # Structured output guarantees the text block is JSON matching SCHEMA. The model thinks
    # adaptively by default and thinking counts against max_tokens, so stream with a large
    # ceiling and medium effort: a review of an 80 KB diff needs room, not depth.
    with anthropic.Anthropic().messages.stream(
        model=model, max_tokens=32000,
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": SCHEMA}},
        system=system, messages=[{"role": "user", "content": user}],
    ) as stream:
        resp = stream.get_final_message()
    meta = f"stop_reason={resp.stop_reason} blocks={[b.type for b in resp.content]} usage={resp.usage}"
    print("review agent:", meta); save_output(f"pr{pr}-response-meta.txt", meta + "\n")
    if resp.stop_reason == "max_tokens":
        raise SystemExit(f"review agent hit max_tokens ({resp.usage.output_tokens} output tokens) before finishing")
    if resp.stop_reason == "refusal":
        raise SystemExit(f"review agent refused ({getattr(resp, 'stop_details', None)})")
    return "".join(b.text for b in resp.content if b.type == "text")

try:
    raw = ask(system, user)
except SystemExit as e:  # truncated or refused output is UNKNOWN, never green
    body = f"### Review gate · YELLOW\n\nThe review agent did not finish: {e}. Re-run."
    upsert_comment(pr, MARKER, body); summary(body); sys.exit(1)
save_output(f"pr{pr}-raw.json", raw)
raw = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip()
try:
    result = json.loads(raw)
    if "checks" in result:  # array shape (CLI backend, or older output)
        checks = {int(c["id"]): c for c in result["checks"]}
    else:  # object shape from the structured-output schema
        checks = {i: result[f"check_{i}"] for i in range(1, 6) if f"check_{i}" in result}
    assert set(checks) == {1, 2, 3, 4, 5}, f"check ids were {sorted(checks)}"
    for c in checks.values():
        assert str(c.get("verdict", "")).upper() in ("PASS", "FAIL", "UNKNOWN"), f"bad verdict {c.get('verdict')!r}"
except Exception as e:  # malformed output is UNKNOWN, never green
    body = f"### Review gate · YELLOW\n\nThe review agent returned output the gate could not parse ({e}). Re-run. Raw output attached below.\n\n```\n{raw[:3000]}\n```"
    upsert_comment(pr, MARKER, body); summary(body); sys.exit(1)

v = {i: checks[i]["verdict"].upper() for i in checks}
if any(v[i] == "FAIL" for i in (1, 2, 5)):
    color, route = "RED", "Stop. Back to the plan owner to amend or reject." + (" A control change is involved; the plan owner reads that first." if v[5] == "FAIL" else "")
elif any(v[i] == "FAIL" for i in (3, 4)) or any(x == "UNKNOWN" for x in v.values()):
    color, route = "YELLOW", "Return for the missing evidence. A senior read is not a substitute."
else:
    color, route = "GREEN", "Eligible for a focused human review. Depth is set by the plan's risk tier, not by this color."

icon = {"PASS": "✅", "FAIL": "❌", "UNKNOWN": "⚠️"}
lines = [f"### Review gate · {color}", "", route, "", f"Plan: `{path}` · model `{model}` · CI `{ci_status}`", "",
         "| # | Check | Verdict | Summary |", "|---|---|---|---|"]
for i in range(1, 6):
    c = checks[i]
    lines.append(f"| {i} | {c['name']} | {icon.get(v[i],'')} {v[i]} | {str(c.get('summary','')).replace('|','/')} |")
lines.append("")
for i in range(1, 6):
    fs = checks[i].get("findings") or []
    if fs:
        lines.append(f"<details><summary>Check {i} findings ({len(fs)})</summary>\n")
        for f in fs:
            lines.append(f"- `{f.get('file')}:{f.get('line')}` · **{f.get('label')}** · {f.get('note')}")
        lines.append("\n</details>\n")
if result.get("missing_evidence"):
    lines.append("**What would settle the UNKNOWNs**")
    lines += [f"- {m}" for m in result["missing_evidence"]]
lines.append("\n_The agent assembles evidence. CI executes. A named engineer decides._")
body = "\n".join(lines)
save_output(f"pr{pr}-comment.md", MARKER + "\n" + body)
upsert_comment(pr, MARKER, body); summary(body)
sys.exit(0 if color == "GREEN" else 1)
