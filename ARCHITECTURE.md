# Architecture

Next.js 15 (App Router) with a SQLite database accessed through `better-sqlite3`. One process, no
external services.

```
browser ── pages (src/app/*)          ─┐
        └─ fetch /api/* (route handlers) ├─ src/lib (auth, clock, daily-mix, recommender)
                                         └─ src/db (plain SQL repository) ── data/app.db
```

## Request flow

1. **Auth.** `/login` sets an httpOnly cookie `dm_session=<userId>`. `getCurrentUser()` in
   `src/lib/auth.ts` resolves it to a user. Route handlers return 401 without a valid session;
   pages call `requireUser()` (`src/lib/session.ts`), which redirects to `/login`.
2. **Home (`/`)** is a server component. It calls `getTodaysMix(user)` for the Daily Mix card and
   `listRecentTracks()` for the "Recently played" grid.
3. **Mix (`/mix`)** is a client component. It fetches `GET /api/mix/today` and renders the tracks,
   their reasons, the Play/Save buttons and the "Why we built this for you" panel.
4. **Save** calls `POST` / `DELETE /api/mix/:id/save`. Only the owner of a mix can save it; any
   other mix id returns 404.
5. **Saved (`/saved`)** is a server component listing the user's saved mixes, newest first.
   `/search` and `/library` are placeholders reached from the tab bar.
6. **Share** calls `POST` / `DELETE /api/mix/:id/share`, mirroring the save endpoint's owner-only,
   401/404 behaviour. A friend opens the resulting `/share/<token>` link with no session at all. See
   "Sharing a mix" below for the boundary this crosses.

## UI shell and player

- `src/app/shell/`: `PhoneFrame` (the device frame shown above 480px, with a status bar and home
  indicator) and the bottom `TabBar`. Presentation only; routes and data don't depend on it.
- `src/app/player/`: a simulated player. `PlayerProvider` in the root layout holds the state from
  `src/lib/player.ts` (a reducer: queue, position, play/pause, next/previous) and advances the
  position on a timer, so playback continues across pages. `MiniPlayer` docks above the tab bar;
  `NowPlaying` slides up over it. There is no audio.
- Covers: `coverUrl(trackId)` in `src/lib/covers.ts` maps a track to `public/covers/<id>.webp`.
- Display copy (mix title, subtitle, the "why" narrative and chips) is derived from a `DailyMix` in
  `src/lib/mix-copy.ts`. It is computed where it's shown and never stored.

## Where the recommender runs

`getTodaysMix()` (`src/lib/daily-mix.ts`) looks up the mix for the user and today's date. If there
is none, it loads the user's plays and the catalogue, calls `buildDailyMix()`
(`src/lib/recommender.ts`), and stores the result in `daily_mixes`. Later requests that day return
the stored mix, so the mix does not change during the day.

`buildDailyMix()` is a pure function: same user, date, plays and catalogue in, same mix out. It
looks at the last 28 days and picks, in order:

1. **context_match**: the track the user finished most often in their top listening context, not
   played in the last 3 days.
2. **artist_affinity**: an unplayed track by the artist the user finishes most reliably.
3. **discovery**: a track by an artist the user has never played (falling back to unplayed tracks
   by artists they don't usually skip).
4. **completion** and catalogue fallbacks, so there are always three items.

"Today" comes from `src/lib/clock.ts` in the `America/Tijuana` time zone. Nothing else reads the
system clock for a date decision.

## What a `DailyMix` contains

- `id`, `userId`, `mixDate`.
- `items`: three entries, each a `track` plus a `reason` with `kind`, the display `text`, and
  `evidence` (the play ids and metric the pick came from).
- `computedFrom`: the window length, the ids of every play considered, and `signals` (top contexts,
  completion rate, late-night ratio, artists the user tends to skip).

The evidence and signals serve two purposes: the mix page uses them to explain the picks, and they
make it possible to see why the recommender chose what it did when debugging.

## Who consumes it today

- `GET /api/mix/today` returns the whole object (plus a `saved` flag for the current user).
- `/mix` renders `items` and turns `computedFrom.signals` and the reason kinds into the
  "Why we built this for you" panel and the mix title.
- `/` reads `mixDate`, the tracks and the top context. `/saved` reads `mixDate`, the tracks and the
  top context (for the title).

## Sharing a mix

A listener can share today's mix with a friend who has no account. This is the one place a
`DailyMix` crosses from a signed-in, owner-only surface to a public one, so the boundary is
enforced by an explicit allowlist rather than by trusting call sites to leave fields out.

- `src/lib/public-mix.ts` (`toPublicMix(mix, owner)`) builds the only shape allowed to cross that
  boundary: `mixDate`, the owner's first name, and each track's `title`, `artist`, `album` and
  `artworkHue`. Nothing else — no `reason`, no `computedFrom`, no ids, no email or plan. It is the
  one function allowed to read a `DailyMix` on the public path.
- `mix_shares` (`token` PK, `mix_id` unique, `owner_id`, `created_at`, `revoked_at`) maps a random,
  128-bit token to a mix. `POST /api/mix/:id/share` creates or returns the owner's token;
  `DELETE /api/mix/:id/share` revokes it. Both require the caller to own the mix, exactly like the
  save endpoint.
- `GET /share/:token` resolves the token to a mix (`findMixByShareToken`, which returns nothing for
  an unknown or revoked token) and renders `SharedMixView` with the narrow, public type only —
  never the internal `MixView`, which takes a full `DailyMix` and would render the reasons and the
  "why" panel. Passing a `DailyMix` into `SharedMixView` is a type error by design.
- The public page carries no explanation text: no reasons, no "why" panel, no neutral summary
  line either. Just the date, the owner's first name, and the three tracks. `layout.tsx` lets the
  mini player and now-playing sheet render without a session so a guest can press Play; the tab
  bar stays gated to signed-in listeners.
- Not in scope: link expiry, rate limiting on the public route, and view counts. Each would need
  its own plan.
