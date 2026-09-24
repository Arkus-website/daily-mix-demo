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
6. **Share.** `POST /api/mix/:id/share` (owner only, same 404-for-others rule as save) returns a
   share token, creating one on first request and reusing it after. `/share/:token` is a public
   server component — no session required — that resolves the token straight from the DB and
   renders the mix read-only. `MixDetail` (`src/app/mix/mix-detail.tsx`) holds the header, "why"
   panel and track list shared by `/mix` and `/share/:token`; each page supplies its own footer
   actions (Save + Share for the owner, nothing extra for a guest). The root layout only shows the
   tab bar to a signed-in `user`; the mini player and now-playing sheet render either way so a
   guest tapping Play still sees it.

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
