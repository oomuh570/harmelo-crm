import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * GET /api/metrics/team
 * Get team-wide totals
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

    // Get current user to verify admin access
    const requester = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { superAdmin: true },
    });

    if (!requester?.superAdmin && requester?.role !== 'SUPER_ADMIN' && requester?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can view team metrics' }, { status: 403 });
    }

    // Get workspaceId if not super admin
    const workspaceId = requester?.workspaceId;

    // Get team metrics
    const teamMetrics = await prisma.teamMetrics.findUnique({
      where: { workspaceId: workspaceId || '' },
    });

    // If no metrics yet, calculate and create them
    if (!teamMetrics && workspaceId) {
      const totalContacts = await prisma.contact.count({
        where: { workspaceId, deletedAt: null },
      });

      const totalActivities = await prisma.activity.count({
        where: {
          contact: { workspaceId },
          deletedAt: null,
        },
      });

      const allFollowUps = await prisma.followUpTask.findMany({
        where: { workspaceId },
        select: { status: true },
      });

      const totalFollowUps = allFollowUps.length;
      const completedFollowUps = allFollowUps.filter(f => f.status === 'COMPLETED').length;

      const created = await prisma.teamMetrics.create({
        data: {
          workspaceId,
          totalContacts,
          totalActivities,
          totalFollowUps,
          completedFollowUps,
        },
      });

      return NextResponse.json(created);
    }

    return NextResponse.json(teamMetrics || {
      totalContacts: 0,
      totalActivities: 0,
      totalFollowUps: 0,
      completedFollowUps: 0,
    });
  } catch (error) {
    console.error('Get team metrics error:', error);
    return NextResponse.json({ error: 'Failed to fetch team metrics' }, { status: 500 });
  }
}
