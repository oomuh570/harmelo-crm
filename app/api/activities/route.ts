import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserApi } from '@/lib/auth';

export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const { type, notes, occurredAt, followUpAt, followUpStatus, contactId } = body;

  const allowedTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE'];
  const resolvedType = type || 'NOTE';
  if (!allowedTypes.includes(resolvedType)) {
    return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
  }

  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    return NextResponse.json({ error: 'Notes must be a string' }, { status: 400 });
  }
  const trimmedNotes = typeof notes === 'string' ? notes.trim() : '';
  if (resolvedType === 'NOTE' && trimmedNotes.length === 0) {
    return NextResponse.json(
      { error: 'Notes are required for a note activity' },
      { status: 400 },
    );
  }

  const allowedFollowUpStatuses = ['PENDING', 'COMPLETED', 'CANCELLED'];
  if (followUpStatus && !allowedFollowUpStatuses.includes(followUpStatus)) {
    return NextResponse.json({ error: 'Invalid followUpStatus' }, { status: 400 });
  }

  const parsedOccurredAt = occurredAt ? new Date(occurredAt) : undefined;
  if (parsedOccurredAt && isNaN(parsedOccurredAt.getTime())) {
    return NextResponse.json({ error: 'Invalid occurredAt date' }, { status: 400 });
  }
  const parsedFollowUpAt = followUpAt ? new Date(followUpAt) : null;
  if (parsedFollowUpAt && isNaN(parsedFollowUpAt.getTime())) {
    return NextResponse.json({ error: 'Invalid followUpAt date' }, { status: 400 });
  }

  // Optional contact: validate it exists and isn't soft-deleted.
  let resolvedContactId: string | null = null;
  if (contactId) {
    if (typeof contactId !== 'string') {
      return NextResponse.json({ error: 'Invalid contactId' }, { status: 400 });
    }
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, deletedAt: null },
      select: { id: true },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    resolvedContactId = contact.id;
  }

  const activity = await prisma.activity.create({
    data: {
      type: resolvedType,
      notes: trimmedNotes,
      occurredAt: parsedOccurredAt,
      followUpAt: parsedFollowUpAt,
      followUpStatus: parsedFollowUpAt ? followUpStatus || 'PENDING' : null,
      contactId: resolvedContactId,
      userId: auth.user.id,
    },
    include: {
      contact: { select: { id: true, name: true } },
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  return NextResponse.json({ activity }, { status: 201 });
}

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
        where: { deletedAt: null, OR: [{ contactId: null }, { contact: { deletedAt: null } }] },
        skip,
        take: safeLimit,
        orderBy: { occurredAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          contact: { select: { id: true, name: true } },
        },
      }),
      prisma.activity.count({
        where: { deletedAt: null, OR: [{ contactId: null }, { contact: { deletedAt: null } }] },
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
