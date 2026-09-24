import { randomUUID } from 'node:crypto';
import { createShareToken, findMixForDate, findShareToken, insertMix, listPlays, listTracks } from '@/db/repo';
import { now, today } from './clock';
import { buildDailyMix } from './recommender';
import type { DailyMix, User } from './types';

/** Today's mix for the user, generated and stored on the first request of the day. */
export function getTodaysMix(user: User): DailyMix {
  const mixDate = today();
  const existing = findMixForDate(user.id, mixDate);
  if (existing) return existing;

  const mix = buildDailyMix({ mixId: randomUUID(), user, mixDate, plays: listPlays(user.id), tracks: listTracks() });
  insertMix(mix, now().toISOString());
  // Re-read so two concurrent first requests both return the row that won the insert.
  return findMixForDate(user.id, mixDate)!;
}

/** The public share token for a mix, creating one on first request. Stable for the life of the mix. */
export function getOrCreateShareToken(mixId: string): string {
  const existing = findShareToken(mixId);
  if (existing) return existing;

  createShareToken(randomUUID(), mixId, now().toISOString());
  // Re-read so two concurrent first requests both return the token that won the insert.
  return findShareToken(mixId)!;
}
