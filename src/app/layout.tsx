import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = { title: 'Daily Mix' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser(await cookies());
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-white/10">
          <nav className="mx-auto flex max-w-2xl items-center gap-6 px-4 py-4 text-sm">
            <Link href="/" className="font-semibold text-emerald-400">
              Daily Mix
            </Link>
            {user && (
              <>
                <Link href="/saved" className="text-zinc-400 hover:text-white">
                  Saved
                </Link>
                <span className="ml-auto text-zinc-400">{user.displayName}</span>
                <Link href="/login" className="text-zinc-400 hover:text-white">
                  Switch user
                </Link>
              </>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
