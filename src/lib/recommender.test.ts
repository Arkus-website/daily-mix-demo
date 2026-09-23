import { describe, expect, it } from 'vitest';
import { findUser, listPlays, listTracks } from '@/db/repo';
import { buildDailyMix } from './recommender';

const tracks = listTracks();
const input = (userId: string, mixDate = '2026-09-23') => ({
  mixId: 'mix-test',
  user: findUser(userId)!,
  mixDate,
  plays: listPlays(userId),
  tracks,
});

describe('buildDailyMix', () => {
  it('is deterministic for the same user and date', () => {
    expect(buildDailyMix(input('u_ana'))).toEqual(buildDailyMix(input('u_ana')));
  });

  it.each(['u_ana', 'u_ben', 'u_chloe', 'u_dev'])('returns three distinct tracks for %s', (userId) => {
    const mix = buildDailyMix(input(userId));
    expect(mix.items).toHaveLength(3);
    expect(new Set(mix.items.map((i) => i.track.id)).size).toBe(3);
    expect(mix.userId).toBe(userId);
  });

  it('uses the three main rules when the history supports them', () => {
    const kinds = buildDailyMix(input('u_ana')).items.map((i) => i.reason.kind);
    expect(kinds).toEqual(['context_match', 'artist_affinity', 'discovery']);
  });

  it('only cites plays that belong to the user', () => {
    for (const userId of ['u_ana', 'u_ben', 'u_chloe', 'u_dev']) {
      const own = new Set(listPlays(userId).map((p) => p.id));
      const mix = buildDailyMix(input(userId));
      for (const item of mix.items) {
        expect(item.reason.evidence.playIds.length).toBeGreaterThan(0);
        for (const id of item.reason.evidence.playIds) expect(own.has(id)).toBe(true);
      }
      for (const id of mix.computedFrom.playIds) expect(own.has(id)).toBe(true);
    }
  });

  it('does not repeat a track heard in the last three days as the context match', () => {
    const { items, mixDate } = buildDailyMix(input('u_ana'));
    const recent = listPlays('u_ana').filter((p) => p.playedAt.slice(0, 10) > '2026-09-20' && p.playedAt.slice(0, 10) <= mixDate);
    expect(recent.map((p) => p.trackId)).not.toContain(items[0].track.id);
  });

  it('still fills three items for a user with no history', () => {
    const mix = buildDailyMix({ ...input('u_ana'), plays: [] });
    expect(mix.items).toHaveLength(3);
    expect(mix.computedFrom.playIds).toEqual([]);
  });
});
