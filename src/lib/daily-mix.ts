import { randomUUID } from 'node:crypto';
import { createShareToken, findMixForDate, findShareToken, insertMix, listPlays, listTracks, revokeShare } from '@/db/repo';
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

/** The mix's share token, creating one (128-bit random) if it doesn't already have an active one. */
export function getOrCreateShareToken(mix: DailyMix): string {
  const existing = findShareToken(mix.id);
  if (existing) return existing;
  const token = randomUUID();
  createShareToken(token, mix.id, mix.userId, now().toISOString());
  return token;
}

/** Revokes the mix's share link, if any. A revoked token 404s on the public route. */
export function revokeShareToken(mix: DailyMix): void {
  revokeShare(mix.id, now().toISOString());
}
