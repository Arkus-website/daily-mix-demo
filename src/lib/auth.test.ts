import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { getCurrentUser } from './auth';

const withCookie = (cookie?: string) =>
  new NextRequest('http://localhost/', { headers: cookie ? { cookie } : {} }).cookies;

describe('getCurrentUser', () => {
  it('returns the user named by the session cookie', () => {
    expect(getCurrentUser(withCookie('dm_session=u_ana'))?.displayName).toBe('Ana Ruiz');
  });

  it('finds the session among other cookies', () => {
    expect(getCurrentUser(withCookie('theme=dark; dm_session=u_ben; lang=en'))?.id).toBe('u_ben');
  });

  it('returns null without a cookie, with an empty one, or for an unknown user', () => {
    expect(getCurrentUser(withCookie())).toBeNull();
    expect(getCurrentUser(withCookie('dm_session='))).toBeNull();
    expect(getCurrentUser(withCookie('dm_session=u_nobody'))).toBeNull();
  });
});
