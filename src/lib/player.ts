import type { Track } from './types';

// Simulated playback: no audio, just a position that advances while "playing".

export type PlayerState = {
  queue: Track[];
  index: number;
  positionMs: number;
  playing: boolean;
  shuffle: boolean;
  repeat: boolean;
  expanded: boolean;
};

export type PlayerAction =
  | { type: 'load'; queue: Track[]; index: number }
  | { type: 'toggle' }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'tick'; ms: number }
  | { type: 'shuffle' }
  | { type: 'repeat' }
  | { type: 'expand' }
  | { type: 'collapse' };

export const initialPlayer: PlayerState = {
  queue: [],
  index: 0,
  positionMs: 0,
  playing: false,
  shuffle: false,
  repeat: false,
  expanded: false,
};

const wrap = (i: number, n: number) => ((i % n) + n) % n;

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  const n = state.queue.length;
  switch (action.type) {
    case 'load':
      return { ...state, queue: action.queue, index: action.index, positionMs: 0, playing: true };
    case 'toggle':
      return n ? { ...state, playing: !state.playing } : state;
    case 'next':
      return n ? { ...state, index: wrap(state.index + 1, n), positionMs: 0 } : state;
    case 'previous':
      // Like most players: restart the track unless we're right at its start.
      if (!n) return state;
      return state.positionMs > 3000 ? { ...state, positionMs: 0 } : { ...state, index: wrap(state.index - 1, n), positionMs: 0 };
    case 'tick': {
      if (!n || !state.playing) return state;
      const position = state.positionMs + action.ms;
      if (position < state.queue[state.index].durationMs) return { ...state, positionMs: position };
      return { ...state, index: wrap(state.index + 1, n), positionMs: 0 };
    }
    case 'shuffle':
      return { ...state, shuffle: !state.shuffle };
    case 'repeat':
      return { ...state, repeat: !state.repeat };
    case 'expand':
      return n ? { ...state, expanded: true } : state;
    case 'collapse':
      return { ...state, expanded: false };
  }
}
