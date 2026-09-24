'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DailyMix } from '@/lib/types';
import { CheckIcon, HeartIcon, ShareIcon } from '../icons';
import { MixDetail } from './mix-detail';

type MixResponse = DailyMix & { saved: boolean };

/** Copies text to the clipboard, falling back to a manual-copy prompt when that's blocked or unavailable. */
function copyLink(url: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(
      () => true,
      () => legacyCopy(url),
    );
    return;
  }
  legacyCopy(url);
}

function legacyCopy(url: string) {
  const textarea = document.createElement('textarea');
  textarea.value = url;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  // Both copy paths above can be silently blocked, so fall back to a dialog the user can copy from themselves.
  if (!copied) window.prompt('Copy this link to share your mix:', url);
}

export function MixView() {
  const router = useRouter();
  const [mix, setMix] = useState<MixResponse | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState(false);

  useEffect(() => {
    fetch('/api/mix/today').then(async (res) => {
      if (res.status === 401) return router.replace('/login');
      setMix(await res.json());
    });
  }, [router]);

  // Fetched ahead of the click so Share can run synchronously — some browsers only allow a
  // clipboard write while still inside the user gesture, and an awaited fetch loses that.
  const mixId = mix?.id;
  useEffect(() => {
    if (!mixId) return;
    fetch(`/api/mix/${mixId}/share`, { method: 'POST' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { token: string } | null) => {
        if (data) setShareUrl(`${window.location.origin}/share/${data.token}`);
      });
  }, [mixId]);

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
    // Usually already fetched ahead of the click (see the effect above); only awaited here on a
    // very fast click, before that request has resolved.
    let url = shareUrl;
    if (!url) {
      const res = await fetch(`/api/mix/${mix.id}/share`, { method: 'POST' });
      if (!res.ok) return;
      const { token } = (await res.json()) as { token: string };
      url = `${window.location.origin}/share/${token}`;
      setShareUrl(url);
    }

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'My Daily Mix', url });
      } catch {
        // The user backed out of the native share sheet — nothing to do.
      }
      return;
    }

    copyLink(url);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1500);
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
            className={`press flex h-12 shrink-0 items-center gap-2 rounded-full border font-semibold ${
              justCopied ? 'border-accent/40 px-5 text-accent' : 'w-12 justify-center border-white/25'
            }`}
          >
            {justCopied ? (
              <>
                <CheckIcon className="h-5 w-5" />
                Copied
              </>
            ) : (
              <ShareIcon className="h-5 w-5" />
            )}
          </button>
        </>
      }
    />
  );
}
