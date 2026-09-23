import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = getCurrentUser(request.cookies);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ id: user.id, displayName: user.displayName, plan: user.plan });
}
