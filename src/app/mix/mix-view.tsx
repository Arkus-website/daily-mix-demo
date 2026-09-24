'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatLongDate } from '@/lib/clock';
import type { DailyMix } from '@/lib/types';
import { MixCard } from './mix-card';

type MixResponse = DailyMix & { saved: boolean };

export function MixView() {
  const router = useRouter();
  const [mix, setMix] = useState<MixResponse | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  async function share() {
    if (!mix) return;
    const res = await fetch(`/api/mix/${mix.id}/share`, { method: 'POST' });
    if (!res.ok) return;
    const { token } = (await res.json()) as { token: string };
    setShareUrl(`${window.location.origin}/share/${token}`);
    setCopied(false);
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      // Clipboard access can fail (e.g. insecure context); the link is still shown for manual copying.
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-emerald-300">Daily Mix</p>
          <h1 className="text-2xl font-bold">{formatLongDate(mix.mixDate)}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={share}
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold hover:border-white/50"
          >
            Share
          </button>
          <button
            onClick={toggleSave}
            className={`rounded-full px-5 py-2 text-sm font-semibold ${
              mix.saved ? 'bg-zinc-800 text-emerald-300' : 'bg-emerald-400 text-black hover:bg-emerald-300'
            }`}
          >
            {mix.saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {shareUrl && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-zinc-900 p-3">
          <input
            readOnly
            value={shareUrl}
            data-testid="share-url"
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 truncate bg-transparent text-sm text-zinc-300 outline-none"
          />
          <button
            onClick={copyShareUrl}
            className="shrink-0 rounded-full border border-white/20 px-4 py-1.5 text-sm hover:border-white/50"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      <MixCard mix={mix} />
    </section>
  );
}
