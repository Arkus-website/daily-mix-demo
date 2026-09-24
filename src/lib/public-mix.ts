import type { DailyMix, User } from './types';

// What a public share exposes, and nothing else. No reasons, evidence, computedFrom, ids, email or plan.
export type PublicMix = {
  mixDate: string;
  ownerFirstName: string;
  tracks: { title: string; artist: string; album: string; artworkHue: number }[];
};

/** Builds the narrow public view of a mix. The only place a `DailyMix` may cross into a public response. */
export function toPublicMix(mix: DailyMix, owner: User): PublicMix {
  return {
    mixDate: mix.mixDate,
    ownerFirstName: owner.displayName.split(' ')[0],
    tracks: mix.items.map(({ track }) => ({
      title: track.title,
      artist: track.artist,
      album: track.album,
      artworkHue: track.artworkHue,
    })),
  };
}
