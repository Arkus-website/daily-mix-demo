import Link from 'next/link';
import { formatLongDate } from '@/lib/clock';
import { getTodaysMix } from '@/lib/daily-mix';
import { requireUser } from '@/lib/session';
import { Artwork } from './artwork';

export default async function HomePage() {
  const user = await requireUser();
  const mix = getTodaysMix(user);
  return (
    <section className="rounded-2xl bg-gradient-to-br from-emerald-900/60 to-zinc-900 p-6">
      <p className="text-sm text-emerald-300">Made for {user.displayName}</p>
      <h1 className="mt-1 text-2xl font-bold">Your Daily Mix for {formatLongDate(mix.mixDate)}</h1>
      <div className="mt-6 flex gap-4">
        {mix.items.map((item) => (
          <Artwork key={item.track.id} hue={item.track.artworkHue} size="lg" />
        ))}
      </div>
      <Link
        href="/mix"
        className="mt-6 inline-block rounded-full bg-emerald-400 px-5 py-2 font-semibold text-black hover:bg-emerald-300"
      >
        Open mix
      </Link>
    </section>
  );
}
