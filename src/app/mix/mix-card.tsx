'use client';

import { useState } from 'react';
import type { DailyMix, PlayContext } from '@/lib/types';
import { Artwork } from '../artwork';

const CONTEXT_NAME: Record<PlayContext, string> = {
  late_night: 'late-night',
  commute: 'commute',
  workout: 'workout',
  focus: 'focus',
  other: 'everyday',
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** The tracks, Play/Pause and "Why these three?" panel — shared by the owner's mix page and public share links. */
export function MixCard({ mix }: { mix: DailyMix }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const { signals, windowDays, playIds } = mix.computedFrom;

  return (
    <>
      <ol className="grid gap-3">
        {mix.items.map((item) => (
          <li key={item.track.id} data-testid="mix-item" className="flex items-center gap-4 rounded-xl bg-zinc-900 p-4">
            <Artwork hue={item.track.artworkHue} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.track.title}</p>
              <p className="text-sm text-zinc-400">
                {item.track.artist} · {item.track.album}
              </p>
              <p data-testid="reason" className="mt-1 text-sm text-emerald-200/80">
                {item.reason.text}
              </p>
            </div>
            <button
              onClick={() => setPlaying(playing === item.track.id ? null : item.track.id)}
              className="rounded-full border border-white/20 px-4 py-1.5 text-sm hover:border-white/50"
            >
              {playing === item.track.id ? 'Pause' : 'Play'}
            </button>
          </li>
        ))}
      </ol>

      {playing && (
        <p className="mt-4 text-sm text-zinc-400">
          Now playing: {mix.items.find((i) => i.track.id === playing)?.track.title}
        </p>
      )}

      <details className="mt-8 text-sm text-zinc-400">
        <summary className="cursor-pointer text-zinc-300">Why these three?</summary>
        <p className="mt-2">
          Based on {playIds.length} plays over {windowDays} days. {pct(signals.lateNightRatio)} late-night. You finish{' '}
          {pct(signals.completionRate)} of what you start.
        </p>
        <p className="mt-1">
          You listen most during{' '}
          {signals.topContexts.map((c) => `${CONTEXT_NAME[c.context]} (${pct(c.ratio)})`).join(', ')}.
        </p>
      </details>
    </>
  );
}
