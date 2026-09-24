'use client';

import { PauseIcon, PlayIcon } from '../icons';
import { Cover } from '../cover';
import { usePlayer } from './player-provider';

export function MiniPlayer() {
  const { state, dispatch } = usePlayer();
  const track = state.queue[state.index];
  if (!track) return null;
  const progress = Math.min(100, (state.positionMs / track.durationMs) * 100);

  return (
    <div data-testid="mini-player" className="mx-2 mb-1 shrink-0 overflow-hidden rounded-xl bg-[#2a2320] shadow-lg">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          onClick={() => dispatch({ type: 'expand' })}
          aria-label={`Open now playing: ${track.title}`}
          className="press flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <Cover trackId={track.id} className="w-10 rounded-md" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{track.title}</span>
            <span className="block truncate text-xs text-white/60">{track.artist}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'toggle' })}
          aria-label={state.playing ? 'Pause' : 'Play'}
          className="press flex h-11 w-11 items-center justify-center"
        >
          {state.playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>
      <div className="h-0.5 bg-white/15">
        <div className="h-full bg-white" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
