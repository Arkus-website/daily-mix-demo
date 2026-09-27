import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { MiniPlayer } from './player/mini-player';
import { NowPlaying } from './player/now-playing';
import { PlayerProvider } from './player/player-provider';
import { PhoneFrame } from './shell/phone-frame';
import { TabBar } from './shell/tab-bar';
import './globals.css';

export const metadata: Metadata = { title: 'Daily Mix' };
export const viewport: Viewport = { themeColor: '#0e0e10', viewportFit: 'cover' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser(await cookies());
  return (
    <html lang="en">
      <body className="antialiased">
        <PlayerProvider>
          <PhoneFrame>
            <main className="no-scrollbar relative flex-1 overflow-y-auto overscroll-contain">{children}</main>
            <MiniPlayer />
            {user && <TabBar />}
            <NowPlaying />
          </PhoneFrame>
        </PlayerProvider>
      </body>
    </html>
  );
}
