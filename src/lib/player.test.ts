import { describe, expect, it } from 'vitest';
import { initialPlayer, playerReducer, type PlayerState } from './player';
import type { Track } from './types';

const track = (id: string, durationMs: number): Track => ({ id, title: id, artist: 'A', album: 'B', durationMs, artworkHue: 0 });
const queue = [track('a', 3000), track('b', 2000), track('c', 1000)];
const loaded = (): PlayerState => playerReducer(initialPlayer, { type: 'load', queue, index: 0 });

describe('playerReducer', () => {
  it('starts playing the chosen track', () => {
    expect(loaded()).toMatchObject({ index: 0, positionMs: 0, playing: true });
  });

  it('advances while playing and moves to the next track at the end', () => {
    let s = playerReducer(loaded(), { type: 'tick', ms: 2000 });
    expect(s).toMatchObject({ index: 0, positionMs: 2000 });
    s = playerReducer(s, { type: 'tick', ms: 1000 });
    expect(s).toMatchObject({ index: 1, positionMs: 0 });
  });

  it('wraps from the last track back to the first', () => {
    let s = playerReducer(loaded(), { type: 'load', queue, index: 2 });
    s = playerReducer(s, { type: 'tick', ms: 1000 });
    expect(s.index).toBe(0);
    expect(playerReducer(s, { type: 'previous' }).index).toBe(2);
  });

  it('does not advance while paused', () => {
    const paused = playerReducer(loaded(), { type: 'toggle' });
    expect(playerReducer(paused, { type: 'tick', ms: 500 }).positionMs).toBe(0);
  });

  it('restarts the current track on previous after a few seconds', () => {
    const s = { ...loaded(), queue: [track('long', 60000)], positionMs: 10000 };
    expect(playerReducer(s, { type: 'previous' })).toMatchObject({ index: 0, positionMs: 0 });
  });

  it('toggles shuffle and repeat without touching the queue', () => {
    const s = playerReducer(playerReducer(loaded(), { type: 'shuffle' }), { type: 'repeat' });
    expect(s).toMatchObject({ shuffle: true, repeat: true, index: 0, queue });
  });
});
