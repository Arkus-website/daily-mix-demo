import { findMixByShareToken, findUser } from '@/db/repo';
import { formatLongDate } from '@/lib/clock';
import { MixCard } from '../../mix/mix-card';

type Params = { params: Promise<{ token: string }> };

export default async function SharedMixPage({ params }: Params) {
  const { token } = await params;
  const mix = findMixByShareToken(token);

  if (!mix) {
    return (
      <section>
        <h1 className="text-2xl font-bold">Link not found</h1>
        <p className="mt-2 text-zinc-400">This share link is invalid, or the mix behind it no longer exists.</p>
      </section>
    );
  }

  const owner = findUser(mix.userId);

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm text-emerald-300">Daily Mix{owner ? ` · shared by ${owner.displayName}` : ''}</p>
        <h1 className="text-2xl font-bold">{formatLongDate(mix.mixDate)}</h1>
      </div>
      <MixCard mix={mix} />
    </section>
  );
}
