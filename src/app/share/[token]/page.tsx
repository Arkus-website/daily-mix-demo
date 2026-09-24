import { notFound } from 'next/navigation';
import { findMixByShareToken, findUser } from '@/db/repo';
import { toPublicMix } from '@/lib/public-mix';
import { SharedMixView } from './shared-mix-view';

type Params = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: Params) {
  const { token } = await params;
  const mix = findMixByShareToken(token);
  const owner = mix && findUser(mix.userId);
  if (!mix || !owner) notFound();

  return <SharedMixView mix={toPublicMix(mix, owner)} />;
}
