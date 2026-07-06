import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

export async function GET(request: Request) {
  try {
    // Auth check — same pattern as T29
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const session = await decrypt(sessionCookie);

    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Read optional date-range query params
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const fromDate = fromParam ? new Date(fromParam) : undefined;
    if (fromDate && isNaN(fromDate.getTime())) {
      return NextResponse.json({ error: 'Invalid from date' }, { status: 400 });
    }

    const toDate = toParam ? new Date(toParam) : undefined;
    if (toDate && isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid to date' }, { status: 400 });
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 && limit <= 100 ? limit : 20;
    const skip = (safePage - 1) * safeLimit;

    // Build the where clause
    const where: Record<string, unknown> = {
      followUpStatus: 'PENDING',
      deletedAt: null,
    };

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
