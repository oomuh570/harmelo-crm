import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * GET /api/activity/team
 * Get team activity history
 */
export async function GET(request: Request) {
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

    // Verify admin access
    const requester = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { superAdmin: true },
    });

    if (!requester?.superAdmin && requester?.role !== 'SUPER_ADMIN' && requester?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can view team activity' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const activities = await prisma.activity.findMany({
      where: {
        deletedAt: null,
      },
      skip: offset,
      take: limit,
      orderBy: { occurredAt: 'desc' },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
        contact: {
          select: { id: true, name: true, organization: true },
        },
      },
    });

    const totalCount = await prisma.activity.count({
      where: { deletedAt: null },
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
    console.error('Get team activity error:', error);
    return NextResponse.json({ error: 'Failed to fetch team activity' }, { status: 500 });
  }
}
