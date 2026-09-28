'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { weekday } from '@/lib/clock';
import { coverGradient } from '@/lib/covers';
import { formatDuration, mixStory, mixTitle, reasonChip } from '@/lib/mix-copy';
import type { DailyMix } from '@/lib/types';
import { Cover, CoverFan } from '../cover';
import { HeartIcon, PlayIcon, ShareIcon } from '../icons';
import { usePlayer } from '../player/player-provider';

type MixResponse = DailyMix & { saved: boolean };

export function MixView() {
  const router = useRouter();
  const { state: player, dispatch } = usePlayer();
  const [mix, setMix] = useState<MixResponse | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState(false);

  useEffect(() => {
    fetch('/api/mix/today').then(async (res) => {
      if (res.status === 401) return router.replace('/login');
      setMix(await res.json());
    });
  }, [router]);

  if (!mix) return <p className="px-5 pt-6 text-white/60">Loading your mix…</p>;

  async function toggleSave() {
    if (!mix) return;
    const res = await fetch(`/api/mix/${mix.id}/save`, { method: mix.saved ? 'DELETE' : 'POST' });
    if (res.ok) {
      const { saved } = (await res.json()) as { saved: boolean };
      setMix({ ...mix, saved });
    }
  }

  async function share() {
    if (!mix) return;
    const res = await fetch(`/api/mix/${mix.id}/share`, { method: 'POST' });
    if (!res.ok) return;
    const { token } = (await res.json()) as { token: string };
    const link = `${window.location.origin}/share/${token}`;
    setShareLink(link);

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Daily Mix', url: link });
        return;
      } catch {
        // Cancelled, or unsupported despite the feature check; the link stays visible below either way.
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch {
      // Clipboard access denied; the link is still shown for the listener to copy by hand.
    }
  }

  async function stopSharing() {
    if (!mix) return;
    await fetch(`/api/mix/${mix.id}/share`, { method: 'DELETE' });
    setShareLink(null);
  }

  const tracks = mix.items.map((i) => i.track);
  const minutes = Math.round(tracks.reduce((sum, t) => sum + t.durationMs, 0) / 60000);
  const story = mixStory(mix);
  const current = player.queue[player.index]?.id;

  return (
    <section className="flex min-h-full flex-col">
      <header className="px-5 pb-6 pt-6 text-center" style={{ background: coverGradient(tracks[0].artworkHue) }}>
        <CoverFan trackIds={tracks.map((t) => t.id)} size="lg" />
        <p className="eyebrow mt-6">Daily Mix · {weekday(mix.mixDate)}</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight">{mixTitle(mix.computedFrom.signals, mix.mixDate)}</h1>
        <p className="mt-2 text-sm text-white/60">
          {tracks.length} songs · {minutes} min · refreshes at midnight
        </p>
      </header>

      <div className="flex-1 px-5">
        <div className="mt-5 rounded-3xl bg-white/[0.06] p-5">
          <h2 className="text-base font-bold">Why we built this for you</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/80">{story.narrative}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {story.chips.map((chip) => (
              <li key={chip} className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-soft">
                {chip}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-white/50">{story.basis}</p>
        </div>

        <ol className="mt-4 grid gap-1">
          {mix.items.map((item, index) => (
            <li key={item.track.id} data-testid="mix-item">
              <button
                type="button"
                onClick={() => dispatch({ type: 'load', queue: tracks, index })}
                className="press flex w-full items-start gap-3 rounded-2xl py-3 text-left"
              >
                <Cover trackId={item.track.id} className="w-14 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${
                      item.reason.kind === 'discovery' ? 'bg-sky-400/15 text-sky-300' : 'bg-accent/15 text-accent-soft'
                    }`}
                  >
                    {reasonChip(item)}
                  </span>
                  <span data-testid="track-title" className={`mt-1 block truncate font-semibold ${current === item.track.id ? 'text-accent' : ''}`}>
                    {item.track.title}
                  </span>
                  <span className="block truncate text-sm text-white/60">{item.track.artist}</span>
                  <span data-testid="reason" className="mt-1 block text-[13px] leading-snug text-white/60">
                    {item.reason.text}
                  </span>
                </span>
                <span className="pt-6 text-xs tabular-nums text-white/50">{formatDuration(item.track.durationMs)}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {shareLink && (
        <div className="mx-5 mb-2 flex items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-4 py-3">
          <span data-testid="share-link" className="min-w-0 flex-1 truncate text-xs text-white/70">
            {shareLink}
          </span>
          <button type="button" onClick={stopSharing} className="press shrink-0 text-xs font-semibold text-white/60">
            Stop sharing
          </button>
        </div>
      )}

      <div className="sticky bottom-0 flex gap-3 bg-gradient-to-t from-ink via-ink/95 to-transparent px-5 pb-3 pt-6">
        <button
          type="button"
          onClick={() => dispatch({ type: 'load', queue: tracks, index: 0 })}
          className="press flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-accent font-bold text-black"
        >
          <PlayIcon className="h-5 w-5" />
          Play
        </button>
        <button
          type="button"
          onClick={toggleSave}
          aria-pressed={mix.saved}
          className={`press flex h-12 items-center gap-2 rounded-full border px-5 font-semibold ${
            mix.saved ? 'border-accent/40 text-accent' : 'border-white/25'
          }`}
        >
          <HeartIcon filled={mix.saved} className="h-5 w-5" />
          {mix.saved ? 'Saved' : 'Save'}
        </button>
        <button
          type="button"
          onClick={share}
          aria-label="Share"
          className="press flex h-12 min-w-12 items-center justify-center gap-2 rounded-full border border-white/25 px-3"
        >
          {justCopied ? <span className="whitespace-nowrap text-[11px] font-semibold">Link copied</span> : <ShareIcon className="h-5 w-5" />}
        </button>
      </div>
    </section>
  );
}
