'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatLongDate } from '@/lib/clock';
import type { DailyMix, PlayContext } from '@/lib/types';
import { Artwork } from '../artwork';

type MixResponse = DailyMix & { saved: boolean };

const CONTEXT_NAME: Record<PlayContext, string> = {
  late_night: 'late-night',
  commute: 'commute',
  workout: 'workout',
  focus: 'focus',
  other: 'everyday',
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function MixView() {
  const router = useRouter();
  const [mix, setMix] = useState<MixResponse | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/mix/today').then(async (res) => {
      if (res.status === 401) return router.replace('/login');
      setMix(await res.json());
    });
  }, [router]);

  if (!mix) return <p className="text-zinc-400">Loading your mix…</p>;

  async function toggleSave() {
    if (!mix) return;
    const res = await fetch(`/api/mix/${mix.id}/save`, { method: mix.saved ? 'DELETE' : 'POST' });
    if (res.ok) {
      const { saved } = (await res.json()) as { saved: boolean };
      setMix({ ...mix, saved });
    }
  }

  const { signals, windowDays, playIds } = mix.computedFrom;

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-emerald-300">Daily Mix</p>
          <h1 className="text-2xl font-bold">{formatLongDate(mix.mixDate)}</h1>
        </div>
        <button
          onClick={toggleSave}
          className={`rounded-full px-5 py-2 text-sm font-semibold ${
            mix.saved ? 'bg-zinc-800 text-emerald-300' : 'bg-emerald-400 text-black hover:bg-emerald-300'
          }`}
        >
          {mix.saved ? 'Saved' : 'Save'}
        </button>
      </div>

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
    </section>
  );
}
