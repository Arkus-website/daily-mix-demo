import { requireUser } from '@/lib/session';
import { SearchIcon } from '../icons';

export default async function SearchPage() {
  await requireUser();
  return (
    <section className="px-5 pt-3">
      <h1 className="text-[26px] font-bold tracking-tight">Search</h1>
      <label className="mt-4 flex h-12 items-center gap-3 rounded-xl bg-white px-4 text-black">
        <SearchIcon className="h-5 w-5 text-black/60" />
        <input placeholder="Artists, songs or albums" className="flex-1 bg-transparent outline-none placeholder:text-black/50" />
      </label>
      <p className="mt-10 text-center text-sm text-white/60">Search is coming soon.</p>
    </section>
  );
}
