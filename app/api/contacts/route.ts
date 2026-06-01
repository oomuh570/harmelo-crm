import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Read pagination values from the URL query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Safety: make sure page and limit are sane numbers
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 && limit <= 100 ? limit : 20;

    // How many rows to skip to reach this page
    const skip = (safePage - 1) * safeLimit;

    // Fetch one page of contacts, and the total count, together
    const [contacts, totalCount] = await Promise.all([
      prisma.contact.findMany({
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contact.count(),
    ]);

    return NextResponse.json({
      contacts,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / safeLimit),
      },
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
