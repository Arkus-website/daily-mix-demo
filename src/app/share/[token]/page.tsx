import { findMixByShareToken } from '@/db/repo';
import { SharedMixView } from './shared-mix-view';

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const mix = findMixByShareToken(token);

  if (!mix) {
    return (
      <section className="flex min-h-full flex-col items-center justify-center px-5 text-center">
        <p className="eyebrow">Daily Mix</p>
        <h1 className="mt-2 text-2xl font-bold">This link isn&apos;t available</h1>
        <p className="mt-2 text-white/60">The mix may have been unshared, or the link is incorrect.</p>
      </section>
    );
  }

  return <SharedMixView mix={mix} />;
}
