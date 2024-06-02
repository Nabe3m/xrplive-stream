import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const inviteUrl = `${req.nextUrl.origin}/room/${userId}`;

  return NextResponse.json({ inviteUrl });
}
