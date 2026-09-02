import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * POST /api/auth/gmail/disconnect
 * Disconnect Gmail from user account
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Remove Gmail connection
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        gmailConnected: false,
        gmailRefreshToken: null,
        gmailLastSync: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Gmail disconnected' });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect Gmail' }, { status: 500 });
  }
}
