import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const scope = searchParams.get('scope') === 'all' ? 'all' : 'mine';
    const userIdParam = searchParams.get('userId');

    const fromDate = fromParam ? new Date(fromParam) : undefined;
    if (fromDate && isNaN(fromDate.getTime())) {
      return NextResponse.json({ error: 'Invalid from date' }, { status: 400 });
    }

    const toDate = toParam ? new Date(toParam) : undefined;
    if (toDate && isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid to date' }, { status: 400 });
    }

    // Admin-only scopes: scope=all or filtering to a userId other than yourself
    const wantsPrivileged =
      scope === 'all' || (userIdParam && userIdParam !== currentUser.id);
    if (wantsPrivileged && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 && limit <= 100 ? limit : 20;
    const skip = (safePage - 1) * safeLimit;

    const where: Record<string, unknown> = {
      followUpStatus: 'PENDING',
      deletedAt: null,
    };

    if (scope === 'mine' && !userIdParam) {
      where.userId = currentUser.id;
    } else if (userIdParam) {
      where.userId = userIdParam;
    }

    if (fromDate || toDate) {
      const followUpAtRange: Record<string, Date> = {};
      if (fromDate) followUpAtRange.gte = fromDate;
      if (toDate) followUpAtRange.lte = toDate;
      where.followUpAt = followUpAtRange;
    }

    const [followUps, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { followUpAt: 'asc' },
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              organization: true,
              type: true,
            },
          },
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      prisma.activity.count({ where }),
    ]);

    return NextResponse.json({
      followUps,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / safeLimit),
      },
    });
  } catch (error) {
    console.error('Get followups error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
