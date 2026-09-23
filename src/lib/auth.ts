import { findUser } from '@/db/repo';
import type { User } from './types';

export const SESSION_COOKIE = 'dm_session';

type CookieReader = { get(name: string): { value: string } | undefined };

/** Reads the session cookie. Works with `request.cookies` in route handlers and `await cookies()` in pages. */
export function getCurrentUser(cookies: CookieReader): User | null {
  const userId = cookies.get(SESSION_COOKIE)?.value?.trim();
  if (!userId) return null;
  return findUser(userId);
}
