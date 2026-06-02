import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/lib/generated/prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search')?.trim() || '';

    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 && limit <= 100 ? limit : 20;

    const skip = (safePage - 1) * safeLimit;

    // Build the filter: always exclude soft-deleted; optionally match the search
    // term against name / email / organization (case-insensitive)
    const where: Prisma.ContactWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { organization: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [contacts, totalCount] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contact.count({ where }),
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, organization, jobTitle, type, notes } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const allowedTypes = [
      'FEDERAL',
      'PROVINCIAL',
      'US',
      'INVESTOR',
      'CUSTOMER',
      'PARTNER',
      'OTHER',
    ];
    if (type && !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid contact type' }, { status: 400 });
    }

    const contact = await prisma.contact.create({
      data: {
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        organization: organization || null,
        jobTitle: jobTitle || null,
        type: type || 'OTHER',
        notes: notes || null,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Create contact error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
