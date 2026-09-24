import { NextResponse, type NextRequest } from 'next/server';
import { findMix } from '@/db/repo';
import { getCurrentUser } from '@/lib/auth';
import { getOrCreateShareToken, revokeShareToken } from '@/lib/daily-mix';

type Params = { params: Promise<{ id: string }> };

async function resolve(request: NextRequest, { params }: Params) {
  const user = getCurrentUser(request.cookies);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const mix = findMix(id);
  // Someone else's mix gets the same answer as a missing one.
  if (!mix || mix.userId !== user.id) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return { mix };
}

export async function POST(request: NextRequest, context: Params) {
  const r = await resolve(request, context);
  if (r instanceof NextResponse) return r;
  return NextResponse.json({ token: getOrCreateShareToken(r.mix) });
}

export async function DELETE(request: NextRequest, context: Params) {
  const r = await resolve(request, context);
  if (r instanceof NextResponse) return r;
  revokeShareToken(r.mix);
  return NextResponse.json({ revoked: true });
}
