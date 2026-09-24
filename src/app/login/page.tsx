import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { findUser, listUsers } from '@/db/repo';
import { SESSION_COOKIE } from '@/lib/auth';

// Development-style sign-in: pick a seeded user. There are no passwords in this app.
async function signIn(formData: FormData) {
  'use server';
  const user = findUser(String(formData.get('userId')));
  if (!user) redirect('/login');
  (await cookies()).set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: 'lax', path: '/' });
  redirect('/');
}

const AVATAR_HUES = [28, 265, 190, 340];

export default function LoginPage() {
  const users = listUsers();
  return (
    <section className="px-5 pt-16">
      <p className="eyebrow">Daily Mix</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Who&apos;s listening?</h1>
      <ul className="mt-8 grid gap-3">
        {users.map((u, i) => (
          <li key={u.id}>
            <form action={signIn}>
              <input type="hidden" name="userId" value={u.id} />
              <button className="press flex min-h-16 w-full items-center gap-4 rounded-2xl bg-white/[0.06] px-4 py-3 text-left">
                <span
                  aria-hidden
                  className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-black"
                  style={{ background: `hsl(${AVATAR_HUES[i % AVATAR_HUES.length]} 80% 70%)` }}
                >
                  {u.displayName
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </span>
                <span className="flex-1 font-semibold">{u.displayName}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                    u.plan === 'premium' ? 'bg-accent/15 text-accent-soft' : 'bg-white/10 text-white/60'
                  }`}
                >
                  {u.plan}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
