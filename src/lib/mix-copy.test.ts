import { describe, expect, it } from 'vitest';
import { findUser, listPlays, listTracks } from '@/db/repo';
import { mixStory, mixTitle } from './mix-copy';
import { buildDailyMix } from './recommender';

const signals = (context: 'late_night' | 'commute' | 'workout' | 'focus' | 'other') => ({
  topContexts: [{ context, ratio: 0.5 }],
  completionRate: 0.8,
  lateNightRatio: 0.5,
  skippedArtistIds: [],
});

describe('mixTitle', () => {
  it('is deterministic for the same signals and date', () => {
    expect(mixTitle(signals('late_night'), '2026-09-23')).toBe(mixTitle(signals('late_night'), '2026-09-23'));
  });

  it('picks from the list for the top context', () => {
    expect(['Slow Burn', 'After Hours', 'Night Shift', 'Low Light']).toContain(mixTitle(signals('late_night'), '2026-09-23'));
    expect(['Deep Work', 'Flow', 'Heads Down']).toContain(mixTitle(signals('focus'), '2026-09-23'));
  });

  it('varies across days', () => {
    const titles = new Set(['2026-09-23', '2026-09-24', '2026-09-25'].map((d) => mixTitle(signals('late_night'), d)));
    expect(titles.size).toBeGreaterThan(1);
  });
});

describe('mixStory', () => {
  it('counts loved and fresh picks from the reasons', () => {
    const mix = buildDailyMix({ mixId: 'm', user: findUser('u_ana')!, mixDate: '2026-09-23', plays: listPlays('u_ana'), tracks: listTracks() });
    const story = mixStory(mix);
    expect(story.chips).toEqual(['1 you love', '2 fresh picks', 'Matched to: late-night']);
    expect(story.basis).toMatch(/^Based on \d+ plays over 28 days\./);
  });
});
