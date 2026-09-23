import { NextResponse, type NextRequest } from 'next/server';
import { isSaved } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';
import { getTodaysMix } from '@/lib/daily-mix';

export async function GET(request: NextRequest) {
  const user = getCurrentUser(request.cookies);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const mix = getTodaysMix(user);
  return NextResponse.json({ ...mix, saved: isSaved(user.id, mix.id) });
}
