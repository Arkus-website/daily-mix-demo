import type { DailyMix, MixItem, PlayContext } from './types';

// Presentation copy derived from a DailyMix on the client. Nothing here is stored or returned by the API.

const TITLES: Record<PlayContext, string[]> = {
  late_night: ['Slow Burn', 'After Hours', 'Night Shift', 'Low Light'],
  commute: ['Rolling In', 'Transit', 'Green Lights'],
  workout: ['Push', 'Tempo', 'Second Wind'],
  focus: ['Deep Work', 'Flow', 'Heads Down'],
  other: ['Daylight', 'Easy Going', 'Everyday'],
};

const FOR_PHRASE: Record<PlayContext, string> = {
  late_night: 'your late nights',
  commute: 'your commute',
  workout: 'your workouts',
  focus: 'deep focus',
  other: 'today',
};

const WHEN_PHRASE: Record<PlayContext, string> = {
  late_night: 'late at night',
  commute: 'on your commute',
  workout: 'during workouts',
  focus: 'while you focus',
  other: 'lately',
};

export const CONTEXT_NAME: Record<PlayContext, string> = {
  late_night: 'late-night',
  commute: 'commute',
  workout: 'workout',
  focus: 'focus',
  other: 'everyday',
};

type Signals = DailyMix['computedFrom']['signals'];

const topContext = (signals: Signals): PlayContext => signals.topContexts[0]?.context ?? 'other';

/** A stable name for the day's mix: same top context and date, same title. */
export function mixTitle(signals: Signals, mixDate: string): string {
  const options = TITLES[topContext(signals)];
  const n = [...mixDate].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return options[n % options.length];
}

export function mixSubtitle(mix: DailyMix): string {
  return `${mix.items.length} songs picked for ${FOR_PHRASE[topContext(mix.computedFrom.signals)]}`;
}

/** Tracks the listener has actually played vs. ones they haven't heard yet. */
export const isFresh = (item: MixItem) => item.reason.kind === 'discovery' || item.reason.kind === 'artist_affinity';

export function reasonChip(item: MixItem): string {
  if (item.reason.kind === 'discovery') return 'FRESH';
  if (item.reason.kind === 'artist_affinity') return 'ARTIST YOU LOVE';
  return 'YOU LOVE THIS';
}

const WORDS = ['no', 'one', 'two', 'three'];

export function mixStory(mix: DailyMix): { narrative: string; chips: string[]; basis: string } {
  const { signals, windowDays, playIds } = mix.computedFrom;
  const context = topContext(signals);
  const fresh = mix.items.filter(isFresh).length;
  const loved = mix.items.length - fresh;
  const favourite = mix.items.find((i) => i.reason.kind === 'artist_affinity' || i.reason.kind === 'context_match');

  const first = favourite
    ? `You wore out ${favourite.track.artist} ${WHEN_PHRASE[context]}.`
    : `You've been listening mostly ${WHEN_PHRASE[context]}.`;
  const second =
    fresh === 0
      ? 'All of these are tracks you already love.'
      : loved === 0
        ? `All ${WORDS[fresh] ?? fresh} are new to you.`
        : `We kept ${WORDS[loved]} you already love and added ${WORDS[fresh]} you haven't pressed play on yet.`;

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return {
    narrative: `${first} ${second}`,
    chips: [`${loved} you love`, `${fresh} fresh ${fresh === 1 ? 'pick' : 'picks'}`, `Matched to: ${CONTEXT_NAME[context]}`],
    basis: `Based on ${playIds.length} plays over ${windowDays} days. ${pct(signals.lateNightRatio)} late-night. You finish ${pct(signals.completionRate)} of what you start.`,
  };
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}
