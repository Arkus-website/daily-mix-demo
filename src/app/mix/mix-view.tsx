'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DailyMix } from '@/lib/types';
import { CheckIcon, HeartIcon, ShareIcon } from '../icons';
import { MixDetail } from './mix-detail';

type MixResponse = DailyMix & { saved: boolean };

export function MixView() {
  const router = useRouter();
  const [mix, setMix] = useState<MixResponse | null>(null);
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
    const url = `${window.location.origin}/share/${token}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Daily Mix', url });
      } catch {
        // The user backed out of the native share sheet — nothing to do.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the button falls back to a no-op rather than throwing.
    }
  }

  return (
    <MixDetail
      mix={mix}
      actions={
        <>
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
            aria-label={justCopied ? 'Link copied' : 'Share'}
            className="press flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/25"
          >
            {justCopied ? <CheckIcon className="h-5 w-5 text-accent" /> : <ShareIcon className="h-5 w-5" />}
          </button>
        </>
      }
    />
  );
}
