import { NextResponse, type NextRequest } from 'next/server';
import { findMix } from '@/db/repo';
import { getOrCreateShareToken } from '@/lib/daily-mix';
import { getCurrentUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = getCurrentUser(request.cookies);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const mix = findMix(id);
  // Someone else's mix gets the same answer as a missing one.
  if (!mix || mix.userId !== user.id) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const token = getOrCreateShareToken(mix.id);
  return NextResponse.json({ token });
}
