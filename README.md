# Daily Mix

A small Spotify-style demo app used in ArkusNexus training material. Not affiliated with Spotify.

Each listener gets one Daily Mix per day: three tracks picked from their recent listening, each
with a short reason ("Because you've finished it 9 times during late-night listens"). The home screen
also shows recently played tracks; listeners can play (simulated, no audio) and save mixes.

The UI is mobile-first. On screens wider than 480px it is presented inside a phone frame; on a phone
it fills the screen. All artists, tracks and cover art are fictional; covers are pre-rendered images
in `public/covers/`.

A listener can also share today's mix with a friend through a link; the friend needs no account to
open it. The shared page carries no explanation of why those tracks were picked — no reasons, no
"why we built this for you" panel — because every reason is derived from the owner's private
listening history. It shows only the date, the owner's first name, and the three tracks. See
"Sharing a mix" in [ARCHITECTURE.md](ARCHITECTURE.md) for the boundary this enforces.

## Run it

Requires Node 22 (see `.nvmrc`).

```bash
npm install
npm run db:seed   # creates data/app.db from data/seed.json
npm run dev       # http://localhost:3000
```

Sign in at `/login` by picking one of the seeded listeners. There are no passwords; the session is
a cookie holding the user id.

`db:seed` wipes and rebuilds the database. Play history in the seed is stored as day offsets, so it
always ends the day before you seed. Set `DM_NOW` (an ISO timestamp) to pin the app's clock.

## Checks

```bash
npm run typecheck
npm run lint
npm test          # Vitest: recommender, auth, API route handlers
npm run build && npm run test:e2e   # Playwright, needs a seeded database
```

CI runs all of the above on every pull request and on pushes to `main`.

## Data model

- `users`: listeners, with display name, email, plan (`free`/`premium`) and country.
- `tracks`: the catalogue. Artwork is a generated colour block from `artwork_hue`.
- `plays`: listening history per user, with time, whether the track was finished, and context (late night, commute, workout, focus, other).
- `daily_mixes`: one generated mix per user per day, stored as JSON (`DailyMix` in `src/lib/types.ts`).
- `saved_mixes`: which mixes each user has saved.

See [ARCHITECTURE.md](ARCHITECTURE.md) for how a request flows through the app.

## License

MIT
