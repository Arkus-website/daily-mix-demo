import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from './auth';
import type { User } from './types';

/** For server components: the signed-in user, or a redirect to /login. */
export async function requireUser(): Promise<User> {
  const user = getCurrentUser(await cookies());
  if (!user) redirect('/login');
  return user;
}
