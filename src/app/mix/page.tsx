import { requireUser } from '@/lib/session';
import { MixView } from './mix-view';

export default async function MixPage() {
  await requireUser();
  return <MixView />;
}
