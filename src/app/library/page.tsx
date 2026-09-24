import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { LibraryIcon } from '../icons';

export default async function LibraryPage() {
  await requireUser();
  return (
    <section className="px-5 pt-3">
      <h1 className="text-[26px] font-bold tracking-tight">Your Library</h1>
      <div className="mt-16 flex flex-col items-center text-center">
        <LibraryIcon className="h-10 w-10 text-white/40" />
        <p className="mt-4 font-semibold">Playlists you make will show up here</p>
        <p className="mt-1 text-sm text-white/60">For now, your saved Daily Mixes are one tap away.</p>
        <Link href="/saved" className="press mt-6 rounded-full bg-white px-5 py-3 text-sm font-bold text-black">
          Saved mixes
        </Link>
      </div>
    </section>
  );
}
