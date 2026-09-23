export type Plan = 'free' | 'premium';

export type PlayContext = 'late_night' | 'commute' | 'workout' | 'focus' | 'other';

export type User = {
  id: string;
  displayName: string;
  email: string;
  plan: Plan;
  country: string;
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  artworkHue: number;
};

export type Play = {
  id: string;
  userId: string;
  trackId: string;
  playedAt: string; // local time in the app time zone, `YYYY-MM-DDTHH:mm`
  completed: boolean;
  context: PlayContext;
};

export type ReasonKind = 'context_match' | 'artist_affinity' | 'completion' | 'discovery';

export type MixItem = {
  track: Track;
  reason: {
    kind: ReasonKind;
    text: string;
    evidence: { playIds: string[]; metric: string; value: number };
  };
};

export type DailyMix = {
  id: string;
  userId: string;
  mixDate: string; // YYYY-MM-DD
  items: MixItem[];
  computedFrom: {
    windowDays: number;
    playIds: string[];
    signals: {
      topContexts: { context: PlayContext; ratio: number }[];
      completionRate: number;
      lateNightRatio: number;
      skippedArtistIds: string[];
    };
  };
};
