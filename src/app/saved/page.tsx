import { listSavedMixes } from '@/db/repo';
import { formatLongDate } from '@/lib/clock';
import { coverGradient } from '@/lib/covers';
import { mixTitle } from '@/lib/mix-copy';
import { requireUser } from '@/lib/session';
import { CoverFan } from '../cover';

export default async function SavedPage() {
  const user = await requireUser();
  const saved = listSavedMixes(user.id);
  return (
    <section className="px-5 pb-6 pt-3">
      <h1 className="text-[26px] font-bold tracking-tight">Saved mixes</h1>
      {saved.length === 0 && <p className="mt-4 text-white/60">Nothing saved yet. Save a Daily Mix to keep it here.</p>}
      <ul className="mt-5 grid gap-3">
        {saved.map(({ mix }) => (
          <li
            key={mix.id}
            className="flex items-center gap-5 rounded-3xl p-4"
            style={{ background: coverGradient(mix.items[0].track.artworkHue) }}
          >
            <div className="w-28 shrink-0">
              <CoverFan trackIds={mix.items.map((i) => i.track.id)} size="sm" />
            </div>
            <div>
              <p className="text-lg font-bold">{mixTitle(mix.computedFrom.signals, mix.mixDate)}</p>
              <p className="text-sm text-white/60">{formatLongDate(mix.mixDate)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
