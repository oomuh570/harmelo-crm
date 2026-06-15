import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 && limit <= 100 ? limit : 20;
    const skip = (safePage - 1) * safeLimit;

    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where: { deletedAt: null, contact: { deletedAt: null } },
        skip,
        take: safeLimit,
        orderBy: { occurredAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          contact: { select: { id: true, name: true } },
        },
      }),
      prisma.activity.count({
        where: { deletedAt: null, contact: { deletedAt: null } },
      }),
    ]);

    return NextResponse.json({
      activities,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / safeLimit)),
      },
    });
  } catch (error) {
    console.error('List activities error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
