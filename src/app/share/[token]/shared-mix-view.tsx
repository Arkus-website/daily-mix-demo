'use client';

import { weekday } from '@/lib/clock';
import { coverGradient } from '@/lib/covers';
import type { PublicMix } from '@/lib/public-mix';
import { PlayIcon } from '../../icons';
import { usePlayer } from '../../player/player-provider';

// A guest has no session, so there is no reason, save state or "why we built this" panel here —
// only what `toPublicMix` exposes. Track art is a colour block (from `artworkHue`), not a photo,
// because the public contract carries no track id to look one up by.
const GUEST_TRACK_DURATION_MS = 3.5 * 60 * 1000;

export function SharedMixView({ mix }: { mix: PublicMix }) {
  const { state: player, dispatch } = usePlayer();

  const queue = mix.tracks.map((track, index) => ({
    id: `shared-${mix.mixDate}-${index}`,
    title: track.title,
    artist: track.artist,
    album: track.album,
    durationMs: GUEST_TRACK_DURATION_MS,
    artworkHue: track.artworkHue,
  }));
  const current = player.queue[player.index]?.title;

  return (
    <section className="flex min-h-full flex-col">
      <header className="px-5 pb-6 pt-6 text-center" style={{ background: coverGradient(mix.tracks[0].artworkHue) }}>
        <div className="relative flex items-center justify-center">
          {mix.tracks[1] && (
            <div
              aria-hidden
              className="-mr-6 aspect-square w-32 -rotate-6 rounded-lg opacity-80"
              style={{ background: coverGradient(mix.tracks[1].artworkHue) }}
            />
          )}
          <div
            aria-hidden
            className="relative z-10 aspect-square w-44 rounded-xl"
            style={{ background: coverGradient(mix.tracks[0].artworkHue) }}
          />
          {mix.tracks[2] && (
            <div
              aria-hidden
              className="-ml-6 aspect-square w-32 rotate-6 rounded-lg opacity-80"
              style={{ background: coverGradient(mix.tracks[2].artworkHue) }}
            />
          )}
        </div>
        <p className="eyebrow mt-6">Daily Mix · {weekday(mix.mixDate)}</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight">{mix.ownerFirstName}&apos;s Daily Mix</h1>
        <p className="mt-2 text-sm text-white/60">{mix.tracks.length} songs</p>
      </header>

      <div className="flex-1 px-5">
        <ol className="mt-4 grid gap-1">
          {mix.tracks.map((track, index) => (
            <li key={index} data-testid="mix-item">
              <button
                type="button"
                onClick={() => dispatch({ type: 'load', queue, index })}
                className="press flex w-full items-center gap-3 rounded-2xl py-3 text-left"
              >
                <span
                  aria-hidden
                  className={`aspect-square w-14 shrink-0 rounded-lg shadow-lg shadow-black/40 ${
                    current === track.title ? 'ring-2 ring-accent' : ''
                  }`}
                  style={{ background: coverGradient(track.artworkHue) }}
                />
                <span className="min-w-0 flex-1">
                  <span data-testid="track-title" className={`block truncate font-semibold ${current === track.title ? 'text-accent' : ''}`}>
                    {track.title}
                  </span>
                  <span className="block truncate text-sm text-white/60">{track.artist}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-ink via-ink/95 to-transparent px-5 pb-3 pt-6">
        <button
          type="button"
          onClick={() => dispatch({ type: 'load', queue, index: 0 })}
          className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent font-bold text-black"
        >
          <PlayIcon className="h-5 w-5" />
          Play
        </button>
      </div>
    </section>
  );
}
