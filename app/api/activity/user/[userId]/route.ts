import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * GET /api/activity/user/[userId]
 * Get user's activity history
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const activities = await prisma.activity.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      skip: offset,
      take: limit,
      orderBy: { occurredAt: 'desc' },
      include: {
        contact: {
          select: { id: true, name: true, organization: true },
        },
      },
    });

    const totalCount = await prisma.activity.count({
      where: {
        userId,
        deletedAt: null,
      },
    });

    return NextResponse.json({
      activities,
      pagination: {
        offset,
        limit,
        total: totalCount,
      },
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    return NextResponse.json({ error: 'Failed to fetch user activity' }, { status: 500 });
  }
}
