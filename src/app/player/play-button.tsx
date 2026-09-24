'use client';

import type { Track } from '@/lib/types';
import { PlayIcon } from '../icons';
import { usePlayer } from './player-provider';

/** Starts playing `queue` from `index`. Renders a round accent button unless given children. */
export function PlayButton({
  queue,
  index = 0,
  label,
  className,
  testId,
  children,
}: {
  queue: Track[];
  index?: number;
  label: string;
  className?: string;
  testId?: string;
  children?: React.ReactNode;
}) {
  const { dispatch } = usePlayer();
  return (
    <button
      type="button"
      aria-label={children ? undefined : label}
      data-testid={testId}
      onClick={() => dispatch({ type: 'load', queue, index })}
      className={className ?? 'press flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black shadow-lg'}
    >
      {children ?? <PlayIcon className="ml-0.5 h-6 w-6" />}
    </button>
  );
}
