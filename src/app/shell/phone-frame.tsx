import { localTime, now } from '@/lib/clock';
import { StatusBar } from './status-bar';

// On wide screens the app is presented inside a phone; on small screens it fills the device.
// Presentation only: routing, data and the API don't know the frame exists.
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh device:flex device:items-center device:justify-center device:p-6">
      <div className="relative flex h-dvh w-full flex-col overflow-clip bg-ink device:h-[min(844px,calc(100dvh-48px))] device:w-[390px] device:rounded-[48px] device:border device:border-white/15 device:shadow-[0_0_0_10px_#18181b,0_0_0_11px_#2e2e33,0_40px_100px_rgba(0,0,0,0.7)]">
        <div aria-hidden className="absolute left-1/2 top-[11px] z-50 hidden h-[32px] w-[120px] -translate-x-1/2 rounded-full bg-black device:block" />
        <StatusBar initialTime={localTime(now())} />
        {children}
        <div aria-hidden className="hidden h-[26px] shrink-0 items-center justify-center device:flex">
          <div className="h-[5px] w-[134px] rounded-full bg-white/80" />
        </div>
      </div>
    </div>
  );
}
