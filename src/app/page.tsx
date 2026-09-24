import Link from 'next/link';
import { listRecentTracks, listTracks } from '@/db/repo';
import { formatLongDate, localHour, now } from '@/lib/clock';
import { coverGradient } from '@/lib/covers';
import { getTodaysMix } from '@/lib/daily-mix';
import { greeting, mixSubtitle, mixTitle } from '@/lib/mix-copy';
import { requireUser } from '@/lib/session';
import { Cover, CoverFan } from './cover';
import { BellIcon } from './icons';
import { PlayButton } from './player/play-button';

const MADE_FOR_YOU = [
  { name: 'Late Night Drive', trackId: 't02' },
  { name: 'Commute Radio', trackId: 't11' },
  { name: 'Focus Flow', trackId: 't23' },
];

export default async function HomePage() {
  const user = await requireUser();
  const mix = getTodaysMix(user);
  const recent = listRecentTracks(user.id, 6);
  const catalogue = new Map(listTracks().map((t) => [t.id, t]));
  const title = mixTitle(mix.computedFrom.signals, mix.mixDate);
  const tracks = mix.items.map((i) => i.track);
  const firstName = user.displayName.split(' ')[0];

  return (
    <div className="px-5 pb-6 pt-3">
      <header className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight">
          {greeting(localHour(now()))}, {firstName}
        </h1>
        <div className="flex items-center gap-1">
          <span className="flex h-11 w-11 items-center justify-center text-white/80">
            <BellIcon />
          </span>
          <Link
            href="/login"
            aria-label="Switch listener"
            className="press flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-black"
          >
            {firstName[0]}
          </Link>
        </div>
      </header>

      <section className="relative mt-5">
        <Link
          href="/mix"
          aria-label="Open mix"
          className="press block overflow-hidden rounded-3xl p-5"
          style={{ background: coverGradient(tracks[0].artworkHue) }}
        >
          <p className="eyebrow text-white/70">Daily Mix · Today</p>
          <h2 aria-label={`Your Daily Mix for ${formatLongDate(mix.mixDate)}: ${title}`} className="mt-1 text-3xl font-extrabold">
            {title}
          </h2>
          <p className="mt-1 text-sm text-white/70">{mixSubtitle(mix)}</p>
          <div className="mt-6 flex justify-start pb-2 pl-4">
            <CoverFan trackIds={tracks.map((t) => t.id)} size="md" />
          </div>
        </Link>
        <div className="absolute bottom-5 right-5">
          <PlayButton queue={tracks} label="Play Daily Mix" />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Recently played</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {recent.map((track) => (
            <PlayButton
              key={track.id}
              queue={[track]}
              label={`Play ${track.title}`}
              testId="recent-tile"
              className="press flex items-center gap-3 overflow-hidden rounded-lg bg-white/[0.08] pr-2 text-left"
            >
              <Cover trackId={track.id} className="w-14 rounded-none shadow-none" />
              <span className="line-clamp-2 text-[13px] font-semibold">{track.title}</span>
            </PlayButton>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Made for you</h2>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-4 overflow-x-auto px-5">
          {MADE_FOR_YOU.map(({ name, trackId }) => (
            <Link key={name} href="/mix" className="press w-36 shrink-0">
              {catalogue.has(trackId) && <Cover trackId={trackId} className="w-36 rounded-2xl" />}
              <p className="mt-2 text-sm font-semibold">{name}</p>
              <p className="text-xs text-white/60">Playlist · Daily Mix</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
