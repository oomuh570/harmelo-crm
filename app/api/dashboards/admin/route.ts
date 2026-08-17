import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * GET /api/dashboards/admin
 * Master admin dashboard data (all team KPIs, all follow-ups, team totals)
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
      return NextResponse.json({ error: 'Only admins can view dashboard' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate') ? new Date(searchParams.get('fromDate')!) : null;
    const toDate = searchParams.get('toDate') ? new Date(searchParams.get('toDate')!) : new Date();

    // Get all team members
    const teamMembers = await prisma.user.findMany({
      where: {
        workspaceId: requester?.workspaceId || undefined,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        lastActivityAt: true,
        metrics: true,
      },
    });

    // Get all pending follow-ups
    const followUps = await prisma.followUpTask.findMany({
      where: {
        workspaceId: requester?.workspaceId || undefined,
        status: 'PENDING',
      },
      orderBy: { dueDate: 'asc' },
      include: {
        contact: {
          select: { id: true, name: true, organization: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // Get team metrics
    const teamMetrics = await prisma.teamMetrics.findUnique({
      where: { workspaceId: requester?.workspaceId || '' },
    });

    // Calculate KPIs for the date range
    let kpiData: any = {
      perUser: [],
      totals: {
        totalActivities: 0,
        totalCalls: 0,
        totalEmails: 0,
        totalMeetings: 0,
        totalNotes: 0,
        totalFollowUpsPending: 0,
        totalFollowUpsCompleted: 0,
      },
    };

    if (fromDate && toDate) {
      const activities = await prisma.activity.findMany({
        where: {
          occurredAt: { gte: fromDate, lte: toDate },
          deletedAt: null,
        },
        select: { userId: true, type: true },
      });

      const userActivityMap = new Map<string, any>();

      for (const activity of activities) {
        if (!userActivityMap.has(activity.userId)) {
          userActivityMap.set(activity.userId, {
            userId: activity.userId,
            totalActivities: 0,
            totalCalls: 0,
            totalEmails: 0,
            totalMeetings: 0,
            totalNotes: 0,
          });
        }

        const ua = userActivityMap.get(activity.userId);
        ua.totalActivities++;
        if (activity.type === 'CALL') ua.totalCalls++;
        if (activity.type === 'EMAIL') ua.totalEmails++;
        if (activity.type === 'MEETING') ua.totalMeetings++;
        if (activity.type === 'NOTE') ua.totalNotes++;
      }

      kpiData.perUser = Array.from(userActivityMap.values());

      // Calculate totals
      for (const activity of activities) {
        kpiData.totals.totalActivities++;
        if (activity.type === 'CALL') kpiData.totals.totalCalls++;
        if (activity.type === 'EMAIL') kpiData.totals.totalEmails++;
        if (activity.type === 'MEETING') kpiData.totals.totalMeetings++;
        if (activity.type === 'NOTE') kpiData.totals.totalNotes++;
      }
    }

    return NextResponse.json({
      teamMembers,
      followUps,
      teamMetrics,
      kpis: kpiData,
      dateRange: {
        from: fromDate,
        to: toDate,
      },
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
