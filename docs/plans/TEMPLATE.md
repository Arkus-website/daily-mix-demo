---
ticket: ""            # ticket id or short slug, e.g. share-daily-mix
title: ""
owner: ""             # GitHub login of the Product Engineer who owns this feature start to finish
risk_tier: low        # low | medium | high
triggers: []          # any of: personal-data, auth, permissions, billing, infra-config; a trigger sets the read depth, not a second reader
status: draft         # draft | approved  (the gate only accepts approved, on the base branch)
---

## What changes
### Files
- 

### Data stores
- 

### Contracts that stay stable
List the contracts this change must not alter, and who consumes them (inside and outside the repo).
- 

### Configuration, permissions, controls
State every config, permission, or security control touched, and whether this plan approves it.
- 

## What crosses the boundary
For every new boundary this change creates (a public link, an export, a webhook, an admin response reused elsewhere): the allowlist. Anything not listed is forbidden.
- 

## Acceptance criteria and evidence
Each criterion names the evidence that proves it. A test that asserts what the response must NOT contain counts. The presence of a test file does not.
| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | | |

## Dependencies
New packages, with why. "None" is a valid answer.
- 

## Out of scope
- 
