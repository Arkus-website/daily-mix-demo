import { describe, expect, it } from 'vitest';
import { findUser, listPlays, listTracks } from '@/db/repo';
import { buildDailyMix } from './recommender';
import { toPublicMix } from './public-mix';

const mix = buildDailyMix({ mixId: 'm', user: findUser('u_ana')!, mixDate: '2026-09-23', plays: listPlays('u_ana'), tracks: listTracks() });

describe('toPublicMix', () => {
  it('exposes exactly the allowlist, and nothing else', () => {
    const publicMix = toPublicMix(mix, findUser('u_ana')!);
    expect(Object.keys(publicMix).sort()).toEqual(['mixDate', 'ownerFirstName', 'tracks']);
    for (const track of publicMix.tracks) {
      expect(Object.keys(track).sort()).toEqual(['album', 'artist', 'artworkHue', 'title']);
    }
  });

  it('carries the mix date and the three tracks', () => {
    const publicMix = toPublicMix(mix, findUser('u_ana')!);
    expect(publicMix.mixDate).toBe('2026-09-23');
    expect(publicMix.tracks).toHaveLength(3);
    expect(publicMix.tracks).toEqual(
      mix.items.map((i) => ({ title: i.track.title, artist: i.track.artist, album: i.track.album, artworkHue: i.track.artworkHue })),
    );
  });

  it("uses the owner's first name only, never the full name or other identity fields", () => {
    const chloe = findUser('u_chloe')!;
    expect(chloe.displayName).toBe('Chloé Martin');
    const publicMix = toPublicMix(mix, chloe);
    expect(publicMix.ownerFirstName).toBe('Chloé');
    expect(JSON.stringify(publicMix)).not.toContain('Martin');
  });

  it('never carries reasons, evidence, computedFrom, or any id', () => {
    const json = JSON.stringify(toPublicMix(mix, findUser('u_ana')!));
    for (const forbidden of ['reason', 'evidence', 'computedFrom', 'playIds', 'signals', 'userId', 'email', 'plan']) {
      expect(json).not.toContain(forbidden);
    }
  });
});
