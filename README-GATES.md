# Gate kit · plan gate + review gate

Two GitHub Actions workflows, one Claude Code command and one plan template. Nothing here touches the app.

Model: one Product Engineer owns a feature start to finish. They run `/plan`, answer the interview, approve the plan by merging its PR, run the agent with the plan attached, and decide on the implementation PR with the five verdicts in hand. There is no second reader; a risk trigger sets the depth of the owner's own read, not who reads.

## What each piece does
- `.claude/commands/plan.md` · `/plan <ticket>` in Claude Code. Reads the repo, drafts the mechanical sections, interviews the engineer one question at a time (risk tier and triggers, allowlist per boundary, product calls, negative tests), writes `docs/plans/<ticket>.md` with `status: draft`. Never implements.
- `docs/plans/TEMPLATE.md` · the one-page plan. Frontmatter carries owner, risk tier, triggers, status.
- `.github/workflows/plan-gate.yml` · check on implementation PRs: the plan exists on `main` with `status: approved` and an owner. Plan PRs themselves (only `docs/plans/` touched) are skipped; the owner approves a plan by merging it.
- `.github/workflows/key-check.yml` · manual. `gh workflow run key-check.yml --ref main` confirms the `ANTHROPIC_API_KEY` secret reaches Actions and the API accepts it.
- `.github/workflows/review-gate.yml` · job `ci` runs typecheck, lint, test, seed, build and the Playwright suite (the same steps as `check` in `ci.yml`) and captures the output; job `review` feeds plan + diff + touched files + CI output to the five-checks prompt, posts one comment per PR (updated in place), and exits non-zero unless Green.
- `scripts/review-gate/PROMPT.md` · the exact prompt. The worksheet copies THIS file; do not keep two versions.
- `scripts/review-gate/run-local.sh` · runs both gates on your laptop against an open PR, posting nothing. See below.

## How the review job reads the PR
The gate reads the plan from the base branch (`origin/main`), never from the PR branch, so a PR cannot approve its own plan. Changed files are read at the PR head commit with `git show`, so the working tree does not matter. The plan path comes from a `Plan: docs/plans/<ticket>.md` line in the PR body, or, failing that, from the branch name (`feature/share-daily-mix` → `docs/plans/share-daily-mix.md`).

Fail-closed rules: no plan → Red; agent output the gate cannot parse → Yellow; no CI output captured → the agent sees `NO CI OUTPUT CAPTURED`, which is an Unknown on check 3.

## Setup (once, ~20 min)
1. Repo secret `ANTHROPIC_API_KEY` (Settings → Secrets and variables → Actions). The `review` job uses it with `claude-sonnet-5` at temperature 0. Verify with `gh workflow run key-check.yml`.
2. Branch protection on `main`: require status checks `check`, `plan-gate` and `review` (job names). No approving-review requirement: a single owner cannot approve their own PR. Do this AFTER the kit PR merges: the kit PR itself has no plan, so plan-gate is Red on it by design.
3. Plan PR convention: branch `plan/<ticket>`, file `docs/plans/<ticket>.md`. Implementation PR: branch `feature/<ticket>` or a `Plan: docs/plans/<ticket>.md` line in the PR body.

## Flow
1. Engineer: `/plan <ticket>` → answers the interview → reads the draft.
2. Sets `status: approved`, opens the plan PR, merges it. That merge is the approval.
3. Agent implements with the plan attached (the 90-word prompt).
4. Implementation PR: plan-gate PASS, ci runs, review posts five verdicts and a color. Non-green blocks merge.
5. The owner reads and decides. Depth by risk tier.

## Run it locally, posting nothing
```
scripts/review-gate/run-local.sh <pr-number> [ci-run-id]
```
Needs `gh` (logged in), `jq`, `python3`, and the `claude` CLI (it uses your Claude Code login by default, `REVIEW_BACKEND=cli`). Set `REVIEW_BACKEND=api` and `ANTHROPIC_API_KEY` to run the exact Actions path (`pip install anthropic`). Input C is the log of the given CI run, or the latest green CI run on the PR head. `PLAN_FILE=/path/to/plan.md` tests a plan that is not on `main` yet. Inputs and outputs land in `.gate-out/` (ignored by git).

The CLI backend has no temperature control, so wording varies more between runs than in Actions; verdicts are what should stay stable. Run each PR twice before trusting a color.

## Webinar sequence (before Tuesday)
1. Merge this kit to `main` in a PR that only adds these files. plan-gate is Red on it (no plan) and that is expected; it is not a required check yet.
2. Add the `ANTHROPIC_API_KEY` secret and run `key-check`.
3. Run `/plan` against the share ticket in Claude Code. Record it: this is the new clip D (60 s, time-lapse the repo read, real time the questions).
4. Set `status: approved`, open the plan PR from that run, merge it. The plan is now on `main`, visible on GitHub.
5. Turn on branch protection (step 2 of Setup).
6. Add `Plan: docs/plans/share-daily-mix.md` to the bodies of PR #3 and PR #4 (a body edit, not a code change), then re-run the gates on both (Actions → workflow → Re-run all jobs, or a `ready_for_review`/`reopened` event). Expected: PR #3 Red (checks 1, 2, 5 fail); PR #4 Green, or a trivial Red on the icon file if the plan does not list it (add it to the plan; that is R3's story, now on screen). This is the new clip B / live tab: the Checks tab + the comment.
7. Re-time R4 from the Actions run durations.
