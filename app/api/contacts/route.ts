import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { Prisma, ContactType } from '@/lib/generated/prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search')?.trim() || '';
    const typeParam = searchParams.get('type')?.trim() || '';
    const tagsParam = searchParams.get('tags')?.trim() || '';
    const allowedTypes = [
      'FEDERAL',
      'PROVINCIAL',
      'US',
      'INVESTOR',
      'CUSTOMER',
      'PARTNER',
      'OTHER',
    ];
    const typeFilter = typeParam
      ? typeParam.split(',').filter((t) => allowedTypes.includes(t))
      : [];
    const tagFilter = tagsParam
      ? tagsParam.split(',').filter((t) => t.length > 0)
      : [];

    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 && limit <= 100 ? limit : 20;

    const skip = (safePage - 1) * safeLimit;

    // Build the filter: always exclude soft-deleted; optionally match the search
    // term against name / email / organization (case-insensitive); optionally
    // filter by contact type (comma-separated list); optionally filter by tags (OR logic).
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
      ...(typeFilter.length > 0 ? { type: { in: typeFilter as ContactType[] } } : {}),
      ...(tagFilter.length > 0
        ? {
            tags: {
              some: {
                tagId: { in: tagFilter },
              },
            },
          }
        : {}),
    };

    const [contacts, totalCount] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          tags: {
            where: { tag: { deletedAt: null } },
            include: { tag: { select: { id: true, name: true, color: true } } },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    return NextResponse.json({
      contacts: contacts.map((c) => ({
        ...c,
        tags: c.tags.map((ct) => ct.tag),
      })),
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
    const { name, email, phone, organization, jobTitle, type, address, notes } = body;

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
        address: address || null,
        notes: notes || null,
      },
    });

    revalidatePath('/');
    revalidatePath('/contacts');
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Create contact error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
