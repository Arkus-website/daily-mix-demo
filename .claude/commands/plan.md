---
description: Interview the assigned engineer and write a one-page implementation plan (docs/plans/<ticket>.md). Never implements.
argument-hint: <ticket text or ticket id>
---

You are running the plan gate for this repository. Your job is to produce a one-page plan at `docs/plans/<ticket>.md` from the template in `docs/plans/TEMPLATE.md`, by reading the repo and interviewing the engineer. You do not write application code in this command, ever.

Ticket: $ARGUMENTS

## Step 1 · Read the repo before asking anything
Explore what the ticket touches: routes, handlers, data models, existing tests, config, auth. Identify:
- files that will change or be created
- data stores read or written
- contracts other code depends on (response shapes, exported functions, DB schemas, env vars) and who consumes them
- configuration, permissions, or security controls the change touches
- whether the change creates a NEW BOUNDARY: any response, page, file, export, webhook, or endpoint that leaves the current trust level (public, unauthenticated, cross-tenant, third-party)
- the risk triggers that apply: personal-data, auth, permissions, billing, infra-config

Draft every section you can answer from the code. Do not ask the engineer for anything the repo already tells you.

## Step 2 · Interview, one question at a time
Ask only the questions the repo cannot answer. Ask them one at a time and wait for the answer. Keep each question to two sentences and state what you found that makes it a question.

Mandatory questions, in this order:
1. Confirm the risk tier and triggers you inferred. Name them. If any trigger applies, ask who the second engineer is (a GitHub login, not the plan owner).
2. For EVERY new boundary: "What may cross it?" Present what the internal object currently contains, field by field, and ask the engineer to name the allowlist. Do not propose a final allowlist yourself; you may say which fields look like personal data or derived from behavior, and why. The engineer decides. Write down what is excluded and the reason.
3. Any product call you cannot infer (behavior in edge cases, what the user can undo, what happens on revoke/delete).
4. Which acceptance criteria need a NEGATIVE test (what the output must NOT contain). Propose one per boundary; the engineer confirms.

Stop asking as soon as every template field is filled. Do not ask "anything else?".

## Step 3 · Write the plan
Write `docs/plans/<ticket>.md` with the template frontmatter, `status: draft`, `owner:` set to the engineer's GitHub login. The plan must fit on one page. Every acceptance criterion names its evidence. "What crosses the boundary" is an explicit allowlist: "Nothing else" is a required line.

## Step 4 · Stop
Tell the engineer:
- the file path
- the one-line command to open the plan PR: `git checkout -b plan/<ticket> && git add docs/plans/<ticket>.md && git commit -m "plan: <ticket>" && gh pr create --title "Plan: <ticket>" --body "Plan gate. Second engineer: @<login>"`
- that implementation starts only after the plan PR is merged with `status: approved`

Do not implement. Do not modify any file outside `docs/plans/`.
