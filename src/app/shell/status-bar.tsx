'use client';

import { useEffect, useState } from 'react';
import { localTime } from '@/lib/clock';
import { StatusGlyphs } from '../icons';

/** Decorative phone status bar. Starts from the server's time, then follows the device clock. */
export function StatusBar({ initialTime }: { initialTime: string }) {
  const [time, setTime] = useState(initialTime);
  useEffect(() => {
    const id = setInterval(() => setTime(localTime(new Date())), 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hidden h-[50px] shrink-0 items-center justify-between px-8 pt-1 text-[15px] font-semibold device:flex">
      <span>{time}</span>
      <StatusGlyphs />
    </div>
  );
}
