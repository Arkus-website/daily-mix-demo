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

export default function LoginPage() {
  const users = listUsers();
  return (
    <section>
      <h1 className="mb-6 text-2xl font-bold">Who&apos;s listening?</h1>
      <ul className="grid gap-3">
        {users.map((u) => (
          <li key={u.id}>
            <form action={signIn}>
              <input type="hidden" name="userId" value={u.id} />
              <button className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-left hover:bg-zinc-800">
                <span className="font-medium">{u.displayName}</span>
                <span className="ml-2 text-sm text-zinc-500">{u.plan}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
