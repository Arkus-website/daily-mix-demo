'use client';

import { createContext, useContext, useEffect, useReducer } from 'react';
import { initialPlayer, playerReducer, type PlayerAction, type PlayerState } from '@/lib/player';

const PlayerContext = createContext<{ state: PlayerState; dispatch: React.Dispatch<PlayerAction> } | null>(null);

const TICK_MS = 500;

/** Holds the simulated player for the whole app so it keeps playing across pages. */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialPlayer);

  useEffect(() => {
    if (!state.playing) return;
    const id = setInterval(() => dispatch({ type: 'tick', ms: TICK_MS }), TICK_MS);
    return () => clearInterval(id);
  }, [state.playing]);

  return <PlayerContext.Provider value={{ state, dispatch }}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
