"""Shared helpers for plan-gate and review-gate."""
import json, os, re, subprocess, sys, pathlib

def sh(*args, check=True, input=None):
    r = subprocess.run(args, capture_output=True, text=True, input=input)
    if check and r.returncode != 0:
        print(r.stdout); print(r.stderr, file=sys.stderr)
        raise SystemExit(f"command failed: {' '.join(args)}")
    return r.stdout

def repo_root() -> pathlib.Path:
    """The scripts run from scripts/review-gate; every repo path resolves from here."""
    return pathlib.Path(sh("git", "rev-parse", "--show-toplevel").strip())

def repo_slug() -> str:
    """owner/name. GITHUB_REPOSITORY in Actions; the origin remote locally."""
    slug = os.environ.get("GITHUB_REPOSITORY")
    if slug:
        return slug
    url = sh("git", "remote", "get-url", "origin").strip()
    m = re.search(r"github\.com[:/]([^/]+/[^/]+?)(?:\.git)?$", url)
    if not m:
        raise SystemExit("cannot resolve the repository slug; set GITHUB_REPOSITORY")
    return m.group(1)

def dry_run() -> bool:
    """DRY_RUN=1 prints the gate comment instead of posting it. Local runs only."""
    return os.environ.get("DRY_RUN", "") not in ("", "0", "false")

def gh_api(path, method="GET", **fields):
    args = ["gh", "api", path, "-X", method]
    for k, v in fields.items():
        args += ["-f", f"{k}={v}"]
    return json.loads(sh(*args))

def resolve_plan_path(pr_body: str, head_ref: str) -> str:
    """Plan path comes from a 'Plan: docs/plans/<x>.md' line in the PR body,
    else from the branch name (feature/share-daily-mix -> docs/plans/share-daily-mix.md)."""
    m = re.search(r"^\s*Plan:\s*(docs/plans/[\w\-./]+\.md)\s*$", pr_body or "", re.M | re.I)
    if m:
        return m.group(1)
    slug = head_ref.split("/")[-1]
    return f"docs/plans/{slug}.md"

def load_plan(path: str, base_ref: str) -> str:
    """The approved plan is read from the BASE branch, never from the PR branch, so a PR
    cannot approve its own plan. Local overrides, for dry runs only:
      PLAN_FILE=/abs/path.md   read this file instead
      PLAN_REF=<git ref>       read <ref>:<path> instead of origin/<base_ref>:<path>"""
    f = os.environ.get("PLAN_FILE")
    if f:
        return pathlib.Path(f).read_text() if pathlib.Path(f).exists() else ""
    ref = os.environ.get("PLAN_REF") or f"origin/{base_ref}"
    return sh("git", "show", f"{ref}:{path}", check=False)

def parse_frontmatter(text: str) -> dict:
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).splitlines():
        line = line.split("#", 1)[0].rstrip()
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        v = v.strip().strip('"').strip("'")
        if v.startswith("["):
            v = [x.strip().strip('"').strip("'") for x in v.strip("[]").split(",") if x.strip()]
        fm[k.strip()] = v
    return fm

def only_touches_plans(files: list[str]) -> bool:
    return bool(files) and all(f.startswith("docs/plans/") for f in files)

def changed_files(base: str, head: str) -> list[str]:
    return [f for f in sh("git", "diff", "--name-only", f"{base}...{head}").split("\n") if f]

def file_at(ref: str, path: str) -> str | None:
    """Content of <path> at <ref>, or None when it does not exist there (deleted file)."""
    r = subprocess.run(["git", "show", f"{ref}:{path}"], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None

def summary(md: str):
    p = os.environ.get("GITHUB_STEP_SUMMARY")
    if p:
        with open(p, "a") as f:
            f.write(md + "\n")
    print(md)

def save_output(name: str, text: str):
    """Keep a copy of what the gate produced. GATE_OUT defaults to .gate-out/ at the repo root."""
    out = pathlib.Path(os.environ.get("GATE_OUT") or (repo_root() / ".gate-out"))
    out.mkdir(parents=True, exist_ok=True)
    (out / name).write_text(text)

def upsert_comment(pr: int, marker: str, body: str):
    """One gate comment per PR, updated in place. DRY_RUN=1 prints instead."""
    if dry_run():
        print(f"\n[DRY_RUN] would post to PR #{pr}:\n{marker}\n{body}\n")
        return
    repo = repo_slug()
    comments = json.loads(sh("gh", "api", f"/repos/{repo}/issues/{pr}/comments", "--paginate"))
    existing = next((c for c in comments if marker in (c.get("body") or "")), None)
    payload = json.dumps({"body": marker + "\n" + body})
    if existing:
        sh("gh", "api", f"/repos/{repo}/issues/comments/{existing['id']}", "-X", "PATCH", "--input", "-", input=payload)
    else:
        sh("gh", "api", f"/repos/{repo}/issues/{pr}/comments", "-X", "POST", "--input", "-", input=payload)
