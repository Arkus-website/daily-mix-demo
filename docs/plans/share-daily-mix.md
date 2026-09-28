---
ticket: "share-daily-mix"
title: "Share today's Daily Mix with a friend via a public link"
owner: "L3ima"
risk_tier: high
triggers: [personal-data, auth]
status: approved
---

## What changes
### Files
- `src/db/client.ts` — new `mix_shares` table (`token` PK, `mix_id`, `user_id`, `created_at`, `revoked_at` nullable) + index on `mix_id`.
- `src/db/repo.ts` — `createShare`, `findActiveShareForMix`, `findActiveShareByToken`, `revokeShare`.
- `src/lib/public-mix.ts` (new) — `toPublicMix(mix, ownerFirstName)`: builds the allowlisted, boundary-safe payload. Track ids in its output are synthetic (`${token}-0/1/2`), never the catalogue id, so they satisfy the `Track` type (for player queue keys / "now playing" match) without exposing which of the 40 catalogue tracks it is.
- `src/app/api/mix/[id]/share/route.ts` (new) — owner-only (session cookie), same "someone else's mix → 404" pattern as the save route:
  - `GET`: current active token for the mix, or `null`.
  - `POST`: idempotent create — returns the existing active token if one exists, else mints one.
  - `DELETE`: revokes the active token (sets `revoked_at`).
- `src/app/share/[token]/page.tsx` (new) — public server component, no `requireUser`. Looks up the token; unknown/revoked → `notFound()`. Renders the allowlisted mix only.
- `src/app/share/[token]/shared-mix-view.tsx` (new) — renders `PublicMix` only, never `DailyMix`; draws gradient tiles from `artworkHue`, never requests a cover image.
- `src/lib/daily-mix.ts` — `getOrCreateShareToken`, `revokeShareToken`, the owner-side helpers the route calls.
- `src/app/layout.tsx` (approved control change) — the mini player and the now-playing sheet render for a guest so Play works on the shared page; the tab bar stays gated to a session. The player only holds what the page already carries, so nothing new crosses the boundary.
- `src/app/icons.tsx` — a `ShareIcon` for the Share button. Presentational, no data.
- `ARCHITECTURE.md`, `README.md` — the share flow and the boundary, documented.
- `src/app/mix/mix-view.tsx` — add a Share entry point: fetches/creates the token, shows the `/share/:token` URL (copy to clipboard) and a "Stop sharing" action once a share is active.
- Tests: `src/app/api/api.test.ts` (share route: create/revoke, owner-only 401/404), `src/lib/public-mix.test.ts` (new: field-allowlist negative test), `e2e/share.spec.ts` (new: open a share link with no session cookie, confirm it renders and Play works, revoke, 404).

### Data stores
- New table `mix_shares` in `data/app.db` (see above). No changes to `daily_mixes`, `saved_mixes`, `users`, `tracks`, `plays`.

### Contracts that stay stable
- `GET /api/mix/today` response shape (consumed by `src/app/mix/mix-view.tsx` and `src/app/api/api.test.ts`) — unchanged; share state is fetched separately, not added to this payload.
- `DailyMix`, `MixItem`, `Track` types (`src/lib/types.ts`) — unchanged. The public payload is a new, separate shape (`PublicMix`, in `src/lib/public-mix.ts`), not a variant of `DailyMix`.
- `POST/DELETE /api/mix/:id/save` — unchanged, still the only route touching `saved_mixes`.
- `Cover`'s existing callers (`mix-view.tsx`, `page.tsx`, `saved/page.tsx`, `mini-player.tsx`, `now-playing.tsx`) — unchanged behavior for any real catalogue id; the `onError` fallback only ever engages for the synthetic ids the share path introduces.

### Configuration, permissions, controls
- New unauthenticated route surface: `GET /share/:token` (page) intentionally bypasses `requireUser`. This plan approves that bypass, scoped strictly to the allowlisted fields below — no other unauthenticated route is added or changed.
- The root layout renders the mini player and the now-playing sheet without a session (so Play works for a guest); the tab bar and every data route stay gated. Approved: the player shell shows nothing the shared page does not already carry.
- `GET/POST/DELETE /api/mix/:id/share` stay behind the existing session-cookie check (`getCurrentUser`), owner-only, same as `/api/mix/:id/save`.

## What crosses the boundary
The public `/share/:token` page (and any JSON it's built from) may carry:
- `mixDate`
- `ownerFirstName` (first name only)
- Per track (of the 3 items): `title`, `artist`, `album`, `artworkHue`, `durationMs`
- A synthetic per-item id (`${token}-<index>`) for player-queue/key purposes only — does not identify a catalogue track or the user.

Nothing else. Specifically excluded: `userId`, `mixId`, the real catalogue `track.id`, `reason` (kind/text), `evidence` (playIds/metric/value), `computedFrom` (`windowDays`, `playIds`, `signals`: `topContexts`, `completionRate`, `lateNightRatio`, `skippedArtistIds`), and the `saved` flag.

## Acceptance criteria and evidence
| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | Owner can get a share link for today's mix from `/mix` | e2e: click Share, a `/share/:token` URL appears |
| 2 | Opening the link with no session cookie renders the mix (heading, 3 tracks, Play) | e2e: fresh browser context (no `dm_session` cookie) loads `/share/:token`, sees heading + 3 tracks, presses Play, mini-player advances |
| 3 | The public payload contains only the allowlisted fields | `src/lib/public-mix.test.ts`: `toPublicMix()` output's keys (incl. nested) equal exactly the allowlist; explicit `expect(...).not.toContain`/`not.toHaveProperty` for `userId`, `computedFrom`, `reason`, `evidence`, real track `id` |
| 4 | A revoked token 404s; an unknown token takes the same null path | e2e: revoke, then `GET /share/<token>` → 404. Unknown tokens: `findMixByShareToken` returns null and the page calls `notFound()` (same branch, by inspection) |
| 5 | Only the mix's owner can create or revoke its share | `api.test.ts`: another user's session → `POST`/`DELETE /api/mix/:id/share` → 404 (same pattern as the save route) |
| 6 | Revoking stops the link and touches nothing but `mix_shares` | `api.test.ts`: revoke returns `{revoked: true}` and re-sharing issues a fresh token; `repo.ts` writes only `mix_shares.revoked_at` (by inspection) |

## Dependencies
None — synthetic ids via string concatenation, tokens via `node:crypto` `randomUUID()` (already used in `src/lib/daily-mix.ts`), clipboard via the browser `navigator.clipboard` API.

## Out of scope
- The `Cover` `onError` fallback for guest tracks in the player: a separate follow-up change. The shared page itself never requests a cover image.
- Real cover art on the share page or in the player when playing a shared mix (gradient tiles only, per the boundary decision).
- A share-management UI (list/revoke-all of a user's outstanding share links) beyond the single active token per mix exposed on `/mix` itself.
- Expiry by date/time (only owner revoke ends a link; otherwise it lives as long as the `daily_mixes` row does).
- Save-to-account from the share page (no account exists for the friend).
- Rate limiting or abuse protection on `/share/:token` (out of scope for this ticket; token space is large enough to resist guessing).
