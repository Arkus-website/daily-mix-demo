#!/usr/bin/env bash
# Run the plan gate and the review gate locally against an open PR, without posting anything.
#
#   scripts/review-gate/run-local.sh <pr-number> [ci-run-id]
#
# Reads the PR from GitHub with gh, uses the log of the given CI run (or the latest
# successful CI run on the PR's head) as input C, and prints both gate comments.
# Env you may set: PLAN_FILE (a local plan to test with), REVIEW_BACKEND (api|cli, default cli),
# REVIEW_MODEL (default claude-sonnet-5), GATE_OUT (where inputs and outputs are kept).
set -euo pipefail
pr="${1:?pr number}"; run_id="${2:-}"
cd "$(git rev-parse --show-toplevel)"
repo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
meta="$(gh pr view "$pr" --json baseRefName,baseRefOid,headRefName,headRefOid,body)"
export GITHUB_REPOSITORY="$repo" PR_NUMBER="$pr" DRY_RUN=1
export BASE_REF="$(jq -r .baseRefName <<<"$meta")" BASE_SHA="$(jq -r .baseRefOid <<<"$meta")"
export HEAD_REF="$(jq -r .headRefName <<<"$meta")" HEAD_SHA="$(jq -r .headRefOid <<<"$meta")"
export PR_BODY="$(jq -r .body <<<"$meta")"
export REVIEW_BACKEND="${REVIEW_BACKEND:-cli}"
export GATE_OUT="${GATE_OUT:-$PWD/.gate-out}"
mkdir -p "$GATE_OUT"
git fetch -q origin "$BASE_REF" "pull/$pr/head"

if [ -z "$run_id" ]; then
  run_id="$(gh run list --workflow CI --commit "$HEAD_SHA" --json databaseId,conclusion -q '[.[]|select(.conclusion=="success")][0].databaseId')"
fi
export CI_LOG="$GATE_OUT/pr$pr-ci-output.txt"
if [ -n "$run_id" ] && [ "$run_id" != "null" ]; then
  # Keep the steps the ci job runs, without the Actions prefixes and colour codes.
  gh run view "$run_id" --log \
    | awk -F'\t' '{print $3}' \
    | perl -pe 's/^[0-9T:.-]+Z //; s/(?:\e|\^\[)\[[0-9;]*m//g' \
    | awk '/##\[group\]Run npm run typecheck/{p=1} /##\[group\](Run actions\/upload-artifact|Post )/{p=0} p' > "$CI_LOG"
  export CI_RESULT="$(gh run view "$run_id" --json conclusion -q 'if .conclusion=="success" then "pass" else "fail" end')"
  echo "CI input: run $run_id ($CI_RESULT), $(wc -l <"$CI_LOG") lines"
else
  export CI_RESULT=unknown
  echo "No CI run found for $HEAD_SHA; the gate will see NO CI OUTPUT CAPTURED"
fi

echo; echo "=== plan-gate · PR #$pr ==="
( cd scripts/review-gate && python3 plan_gate.py ) || true
echo; echo "=== review-gate · PR #$pr · backend $REVIEW_BACKEND ==="
( cd scripts/review-gate && python3 review_gate.py ) || true
