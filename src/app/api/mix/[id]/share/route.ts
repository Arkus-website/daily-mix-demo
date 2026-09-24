import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createShareToken, findMix, findShareToken } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';
import { now } from '@/lib/clock';

type Params = { params: Promise<{ id: string }> };

/** Returns a public share token for the mix, creating one on first request. Only the owner can share. */
export async function POST(request: NextRequest, { params }: Params) {
  const user = getCurrentUser(request.cookies);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const mix = findMix(id);
  if (!mix || mix.userId !== user.id) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const token = findShareToken(mix.id) ?? randomUUID();
  createShareToken(token, mix.id, now().toISOString());
  return NextResponse.json({ token });
}
