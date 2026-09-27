"""plan-gate: an implementation PR needs an approved plan on the base branch.

Passes when:
  - the PR only touches docs/plans/ (it IS a plan PR; the owner approves it by merging), or
  - the plan file resolved from the PR body/branch exists on the base branch,
    has status: approved and names an owner (the Product Engineer who owns the
    feature start to finish; there is no second reader in this model).
"""
import os, sys
from common import *

base_ref = os.environ["BASE_REF"]; base_sha = os.environ["BASE_SHA"]; head_sha = os.environ["HEAD_SHA"]
head_ref = os.environ["HEAD_REF"]; pr = int(os.environ["PR_NUMBER"]); repo = repo_slug()
MARKER = "<!-- plan-gate -->"

files = changed_files(base_sha, head_sha)
if only_touches_plans(files):
    summary("**plan-gate** · this is a plan PR; the owner approves it by merging. Nothing to check here.")
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
    owner = str(fm.get("owner", "")).lstrip("@")
    if not owner:
        problems.append("Plan has no `owner:`.")

if problems:
    body = f"### Plan gate · RED\n\nImplementation PRs need an approved plan before they can be reviewed.\n\n" + "\n".join(f"- {p}" for p in problems)
    save_output(f"pr{pr}-plan-gate.md", body)
    upsert_comment(pr, MARKER, body); summary(body); sys.exit(1)

body = f"### Plan gate · PASS\n\nPlan: `{path}` · owner `@{fm.get('owner')}` · tier `{fm.get('risk_tier')}` · triggers `{fm.get('triggers')}`"
save_output(f"pr{pr}-plan-gate.md", body)
upsert_comment(pr, MARKER, body); summary(body)
