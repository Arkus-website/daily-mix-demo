"""plan-gate: an implementation PR needs an approved plan on the base branch.

Passes when:
  - the PR only touches docs/plans/ (it IS a plan PR; CODEOWNERS governs it), or
  - the plan file resolved from the PR body/branch exists on the base branch,
    has status: approved, and, if any trigger applies, names a second_engineer
    (not the owner) who approved the PR that merged the plan.
"""
import os, sys
from common import *

base_ref = os.environ["BASE_REF"]; base_sha = os.environ["BASE_SHA"]; head_sha = os.environ["HEAD_SHA"]
head_ref = os.environ["HEAD_REF"]; pr = int(os.environ["PR_NUMBER"]); repo = repo_slug()
MARKER = "<!-- plan-gate -->"

files = changed_files(base_sha, head_sha)
if only_touches_plans(files):
    summary("**plan-gate** · this is a plan PR; Code Owner review applies. Nothing to check here.")
    sys.exit(0)

path = resolve_plan_path(os.environ.get("PR_BODY", ""), head_ref)
problems = []

text = load_plan(path, base_ref)
if not text.strip():
    problems.append(f"No approved plan at `{path}` on `{base_ref}`. Write it with `/plan`, open the plan PR, get it approved and merged, then re-run.")
    fm = {}
else:
    fm = parse_frontmatter(text)
    if fm.get("status") != "approved":
        problems.append(f"`{path}` is on `{base_ref}` but `status:` is `{fm.get('status')}`, not `approved`.")
    triggers = fm.get("triggers") or []
    if isinstance(triggers, str):
        triggers = [triggers] if triggers else []
    owner = str(fm.get("owner", "")).lstrip("@"); second = str(fm.get("second_engineer", "")).lstrip("@")
    if not owner:
        problems.append("Plan has no `owner:`.")
    if triggers:
        if not second:
            problems.append(f"Triggers {triggers} apply, so `second_engineer:` is required.")
        elif second.lower() == owner.lower():
            problems.append("`second_engineer` must not be the plan owner.")
        else:
            # Find the PR that merged the plan file and confirm the second engineer approved it.
            ref = os.environ.get("PLAN_REF") or f"origin/{base_ref}"
            sha = sh("git", "log", "-1", "--format=%H", ref, "--", path, check=False).strip()
            prs = gh_api(f"/repos/{repo}/commits/{sha}/pulls") if sha else []
            approved = False
            for p in prs:
                reviews = gh_api(f"/repos/{repo}/pulls/{p['number']}/reviews")
                approved |= any(r["state"] == "APPROVED" and r["user"]["login"].lower() == second.lower() for r in reviews)
            if not approved:
                problems.append(f"Triggers {triggers} require an independent read: `@{second}` has not approved the plan PR that merged `{path}`.")

if problems:
    body = f"### Plan gate · RED\n\nImplementation PRs need an approved plan before they can be reviewed.\n\n" + "\n".join(f"- {p}" for p in problems)
    save_output(f"pr{pr}-plan-gate.md", body)
    upsert_comment(pr, MARKER, body); summary(body); sys.exit(1)

body = f"### Plan gate · PASS\n\nPlan: `{path}` · owner `@{fm.get('owner')}` · tier `{fm.get('risk_tier')}` · triggers `{fm.get('triggers')}`" + (f" · second engineer `@{fm.get('second_engineer')}` approved" if fm.get("second_engineer") else "")
save_output(f"pr{pr}-plan-gate.md", body)
upsert_comment(pr, MARKER, body); summary(body)
