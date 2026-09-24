'use client';

import type { DailyMix } from '@/lib/types';
import { MixDetail } from '../../mix/mix-detail';

/** A read-only view of a shared mix. Anyone with the link can open it — no session required. */
export function SharedMixView({ mix }: { mix: DailyMix }) {
  return <MixDetail mix={mix} />;
}
