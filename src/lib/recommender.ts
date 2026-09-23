import { addDays } from './clock';
import type { DailyMix, MixItem, Play, PlayContext, Track, User } from './types';

// Builds a user's Daily Mix from their recent listening. Pure and deterministic: the same inputs
// always give the same mix, and ties are broken by a PRNG seeded with (userId, mixDate).
//
// Every item carries a reason the UI shows under the track, plus the evidence (play ids and the
// metric) it was derived from, so a pick can be explained and debugged from the mix alone.

export const WINDOW_DAYS = 28;
const RECENT_DAYS = 3;
const MIX_SIZE = 3;

const CONTEXT_LABEL: Record<PlayContext, string> = {
  late_night: 'late-night listens',
  commute: 'your commute',
  workout: 'workouts',
  focus: 'focus sessions',
  other: 'everyday listening',
};

export type RecommenderInput = {
  mixId: string;
  user: User;
  mixDate: string;
  plays: Play[];
  tracks: Track[];
};

export function artistId(artist: string): string {
  return artist
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildDailyMix({ mixId, user, mixDate, plays, tracks }: RecommenderInput): DailyMix {
  const rng = seededRandom(`${user.id}:${mixDate}`);
  const trackById = new Map(tracks.map((t) => [t.id, t]));
  const artistOf = (p: Play) => trackById.get(p.trackId)?.artist ?? '';

  const windowStart = addDays(mixDate, -WINDOW_DAYS);
  const recentStart = addDays(mixDate, -RECENT_DAYS);
  const dateOf = (p: Play) => p.playedAt.slice(0, 10);
  const windowPlays = plays.filter((p) => p.userId === user.id && dateOf(p) > windowStart && dateOf(p) <= mixDate);

  const playedTrackIds = new Set(plays.filter((p) => p.userId === user.id).map((p) => p.trackId));
  const playedArtists = new Set([...playedTrackIds].map((id) => trackById.get(id)?.artist));
  const recentTrackIds = new Set(windowPlays.filter((p) => dateOf(p) > recentStart).map((p) => p.trackId));

  // Signals

  const contextCounts = countBy(windowPlays, (p) => p.context);
  const topContexts = [...contextCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([context, count]) => ({ context, ratio: round(count / windowPlays.length) }));

  const artistStats = new Map<string, { plays: Play[]; completed: number }>();
  for (const p of windowPlays) {
    const s = artistStats.get(artistOf(p)) ?? { plays: [], completed: 0 };
    s.plays.push(p);
    if (p.completed) s.completed++;
    artistStats.set(artistOf(p), s);
  }
  const artistRate = (a: string) => {
    const s = artistStats.get(a)!;
    return s.completed / s.plays.length;
  };
  const skippedArtists = [...artistStats.keys()].filter((a) => artistStats.get(a)!.plays.length >= 3 && artistRate(a) < 0.4);

  const completed = windowPlays.filter((p) => p.completed);
  const signals = {
    topContexts,
    completionRate: windowPlays.length ? round(completed.length / windowPlays.length) : 0,
    lateNightRatio: windowPlays.length ? round((contextCounts.get('late_night') ?? 0) / windowPlays.length) : 0,
    skippedArtistIds: skippedArtists.map(artistId).sort(),
  };

  // Picks, in rule order

  const items: MixItem[] = [];
  const taken = new Set<string>();
  const add = (trackId: string, reason: MixItem['reason']) => {
    items.push({ track: trackById.get(trackId)!, reason });
    taken.add(trackId);
  };
  const available = (id: string) => trackById.has(id) && !taken.has(id);

  // 1. context_match: the track most often finished in the user's top context, not heard in the last few days.
  const topContext = topContexts[0]?.context;
  if (topContext) {
    const finishedInContext = completed.filter((p) => p.context === topContext && !recentTrackIds.has(p.trackId));
    const best = pickTop(countBy(finishedInContext, (p) => p.trackId), rng, available);
    if (best) {
      const evidence = finishedInContext.filter((p) => p.trackId === best.key).map((p) => p.id);
      add(best.key, {
        kind: 'context_match',
        text: `Because you've finished it ${best.count} times during ${CONTEXT_LABEL[topContext]}`,
        evidence: { playIds: evidence, metric: `completed_plays_${topContext}`, value: best.count },
      });
    }
  }

  // 2. artist_affinity: something new from the artist the user finishes most reliably.
  const affinityArtists = [...artistStats.keys()]
    .filter((a) => artistStats.get(a)!.plays.length >= 3)
    .sort((a, b) => artistRate(b) - artistRate(a) || a.localeCompare(b));
  for (const artist of affinityArtists) {
    const candidates = tracks.filter((t) => t.artist === artist && !playedTrackIds.has(t.id) && available(t.id));
    if (!candidates.length) continue;
    const track = candidates[Math.floor(rng() * candidates.length)];
    const artistPlays = artistStats.get(artist)!.plays;
    const rate = artistRate(artist);
    const mainContext = [...countBy(artistPlays, (p) => p.context).entries()].sort((a, b) => b[1] - a[1])[0][0];
    const outOfTen = Math.round(rate * 10);
    const frequency = outOfTen === 10 ? 'every time' : `${outOfTen} times out of 10`;
    add(track.id, {
      kind: 'artist_affinity',
      text: `Because you finish ${artist}'s tracks ${frequency} on ${CONTEXT_LABEL[mainContext]}`,
      evidence: { playIds: artistPlays.map((p) => p.id), metric: 'artist_completion_rate', value: round(rate) },
    });
    break;
  }

  // 3. discovery: an artist the user has never played; failing that, an unheard track away from skipped artists.
  const topArtists = [...artistStats.entries()]
    .sort((a, b) => b[1].completed - a[1].completed || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([a]) => a);
  const discoveryPool = tracks.filter((t) => !playedArtists.has(t.artist) && available(t.id));
  const fallbackPool = tracks.filter((t) => !playedTrackIds.has(t.id) && !skippedArtists.includes(t.artist) && available(t.id));
  const pool = discoveryPool.length ? discoveryPool : fallbackPool;
  if (pool.length) {
    const track = pool[Math.floor(rng() * pool.length)];
    const evidence = completed.filter((p) => topArtists.includes(artistOf(p))).map((p) => p.id);
    add(track.id, {
      kind: 'discovery',
      text: topArtists.length
        ? `New to you. Picked to sit alongside ${topArtists.join(' and ')}`
        : 'New to you. A fresh pick to get started',
      evidence: { playIds: evidence, metric: 'top_artist_completed_plays', value: evidence.length },
    });
  }

  // 4. Fallbacks: the user's most-finished tracks, then anything left in the catalogue.
  const byCompletion = [...countBy(completed, (p) => p.trackId).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [trackId, count] of byCompletion) {
    if (items.length >= MIX_SIZE) break;
    if (!available(trackId)) continue;
    add(trackId, {
      kind: 'completion',
      text: `One of your most finished tracks: ${count} full listens in the last ${WINDOW_DAYS} days`,
      evidence: { playIds: completed.filter((p) => p.trackId === trackId).map((p) => p.id), metric: 'completed_plays', value: count },
    });
  }
  for (const track of tracks) {
    if (items.length >= MIX_SIZE) break;
    if (!available(track.id)) continue;
    add(track.id, {
      kind: 'discovery',
      text: 'New to you. A fresh pick to get started',
      evidence: { playIds: [], metric: 'catalogue_fill', value: 0 },
    });
  }

  return {
    id: mixId,
    userId: user.id,
    mixDate,
    items: items.slice(0, MIX_SIZE),
    computedFrom: { windowDays: WINDOW_DAYS, playIds: windowPlays.map((p) => p.id), signals },
  };
}

function countBy<T, K>(items: T[], key: (item: T) => K): Map<K, number> {
  const counts = new Map<K, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}

/** Highest count among allowed keys; ties broken with the seeded PRNG. */
function pickTop(counts: Map<string, number>, rng: () => number, allowed: (key: string) => boolean) {
  const entries = [...counts.entries()].filter(([k]) => allowed(k)).sort((a, b) => a[0].localeCompare(b[0]));
  if (!entries.length) return null;
  const max = Math.max(...entries.map(([, c]) => c));
  const tied = entries.filter(([, c]) => c === max);
  const [key, count] = tied[Math.floor(rng() * tied.length)];
  return { key, count };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** mulberry32 seeded from an FNV-1a hash of the seed string. */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
