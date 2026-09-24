'use client';

import { coverGradient, coverUrl } from '@/lib/covers';
import { formatDuration } from '@/lib/mix-copy';
import { ChevronDownIcon, NextIcon, PauseIcon, PlayIcon, PreviousIcon, RepeatIcon, ShuffleIcon } from '../icons';
import { Cover } from '../cover';
import { usePlayer } from './player-provider';

export function NowPlaying() {
  const { state, dispatch } = usePlayer();
  const track = state.queue[state.index];
  const open = state.expanded && !!track;
  const progress = track ? Math.min(100, (state.positionMs / track.durationMs) * 100) : 0;

  return (
    <section
      data-testid="now-playing"
      data-state={open ? 'open' : 'closed'}
      aria-hidden={!open}
      inert={!open}
      className={`absolute inset-0 z-40 flex flex-col overflow-hidden transition-transform duration-[250ms] ease-out ${
        open ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={track ? { background: coverGradient(track.artworkHue) } : undefined}
    >
      {track && (
        <>
          <div
            aria-hidden
            className="absolute inset-0 scale-125 bg-cover bg-center opacity-40 blur-3xl"
            style={{ backgroundImage: `url(${coverUrl(track.id)})` }}
          />
          <div className="relative flex flex-1 flex-col px-6 pb-8 pt-4 device:pt-14">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => dispatch({ type: 'collapse' })}
                aria-label="Collapse player"
                className="press -ml-2 flex h-11 w-11 items-center justify-center"
              >
                <ChevronDownIcon className="h-7 w-7" />
              </button>
              <p className="eyebrow">Playing from Daily Mix</p>
              <span className="w-11" />
            </div>

            <Cover trackId={track.id} className="mx-auto mt-8 w-full max-w-[320px] rounded-2xl shadow-2xl" />

            <div className="mt-8">
              <h2 data-testid="now-playing-title" className="text-2xl font-bold">
                {track.title}
              </h2>
              <p className="text-white/60">{track.artist}</p>
            </div>

            <div className="mt-6">
              <div className="h-1 rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-white/60">
                <span>{formatDuration(state.positionMs)}</span>
                <span>{formatDuration(track.durationMs)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Toggle label="Shuffle" on={state.shuffle} onClick={() => dispatch({ type: 'shuffle' })}>
                <ShuffleIcon />
              </Toggle>
              <button type="button" aria-label="Previous" onClick={() => dispatch({ type: 'previous' })} className="press p-2">
                <PreviousIcon className="h-8 w-8" />
              </button>
              <button
                type="button"
                aria-label={state.playing ? 'Pause' : 'Play'}
                onClick={() => dispatch({ type: 'toggle' })}
                className="press flex h-16 w-16 items-center justify-center rounded-full bg-accent text-black"
              >
                {state.playing ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="ml-1 h-7 w-7" />}
              </button>
              <button type="button" aria-label="Next" onClick={() => dispatch({ type: 'next' })} className="press p-2">
                <NextIcon className="h-8 w-8" />
              </button>
              <Toggle label="Repeat" on={state.repeat} onClick={() => dispatch({ type: 'repeat' })}>
                <RepeatIcon />
              </Toggle>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Toggle({ label, on, onClick, children }: { label: string; on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      className={`press flex h-11 w-11 flex-col items-center justify-center ${on ? 'text-accent' : 'text-white/70'}`}
    >
      {children}
      <span className={`mt-0.5 h-1 w-1 rounded-full ${on ? 'bg-accent' : 'bg-transparent'}`} />
    </button>
  );
}
