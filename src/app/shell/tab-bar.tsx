'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, LibraryIcon, SearchIcon } from '../icons';

const TABS = [
  { href: '/', label: 'Home', Icon: HomeIcon, match: (p: string) => p === '/' || p === '/mix' },
  { href: '/search', label: 'Search', Icon: SearchIcon, match: (p: string) => p === '/search' },
  { href: '/library', label: 'Your Library', Icon: LibraryIcon, match: (p: string) => p === '/library' || p === '/saved' },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="flex shrink-0 justify-around bg-gradient-to-t from-black via-black/95 to-black/80 pb-[max(env(safe-area-inset-bottom),4px)] pt-2">
      {TABS.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`press flex min-h-11 min-w-20 flex-col items-center justify-center gap-1 text-[11px] ${
              active ? 'text-accent' : 'text-white/60'
            }`}
          >
            <Icon className="h-6 w-6" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
