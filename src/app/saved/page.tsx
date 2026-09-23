import { listSavedMixes } from '@/db/repo';
import { formatLongDate } from '@/lib/clock';
import { requireUser } from '@/lib/session';
import { Artwork } from '../artwork';

export default async function SavedPage() {
  const user = await requireUser();
  const saved = listSavedMixes(user.id);
  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold">Saved mixes</h1>
      {saved.length === 0 && <p className="text-zinc-400">Nothing saved yet. Save a Daily Mix to keep it here.</p>}
      <ul className="grid gap-4">
        {saved.map(({ mix }) => (
          <li key={mix.id} className="rounded-xl bg-zinc-900 p-4">
            <p className="font-medium">{formatLongDate(mix.mixDate)}</p>
            <div className="mt-3 flex gap-3">
              {mix.items.map((item) => (
                <div key={item.track.id} className="flex items-center gap-2">
                  <Artwork hue={item.track.artworkHue} />
                  <span className="text-sm text-zinc-300">{item.track.title}</span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
