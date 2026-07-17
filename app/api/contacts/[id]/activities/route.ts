import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Contact id is required' }, { status: 400 });
    }

    // Confirm the contact exists and isn't soft-deleted
    const contact = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Read pagination values from the URL query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 && limit <= 100 ? limit : 20;
    const skip = (safePage - 1) * safeLimit;

    // Fetch this contact's activities (excluding soft-deleted) and total count
    const [activities, totalCount] = await Promise.all([
      prisma.activity.findMany({
        where: { contactId: id, deletedAt: null },
        skip,
        take: safeLimit,
        orderBy: { occurredAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      prisma.activity.count({
        where: { contactId: id, deletedAt: null },
      }),
    ]);

    return NextResponse.json({
      activities,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / safeLimit),
      },
    });
  } catch (error) {
    console.error('Get activities error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Contact id is required' }, { status: 400 });
    }

    // Confirm the contact exists and isn't soft-deleted
    const contact = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Figure out who the calling user is from the session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const session = await decrypt(sessionCookie);

    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Confirm the user still exists (handles deleted accounts with a still-valid session cookie)
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Read and validate the request body
    const body = await request.json();
    const { type, notes, occurredAt, followUpAt, followUpStatus } = body;

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      return NextResponse.json({ error: 'Notes must be a string' }, { status: 400 });
    }

    const allowedTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE'];
    if (type && !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
    }

    // NOTE-type activities must have non-empty notes; other types are freeform
    const resolvedType = type || 'NOTE';
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


    // Parse dates safely — invalid strings become a 400 instead of corrupting data
    const parsedOccurredAt = occurredAt ? new Date(occurredAt) : undefined;
    if (parsedOccurredAt && isNaN(parsedOccurredAt.getTime())) {
      return NextResponse.json({ error: 'Invalid occurredAt date' }, { status: 400 });
    }

    const parsedFollowUpAt = followUpAt ? new Date(followUpAt) : null;
    if (parsedFollowUpAt && isNaN(parsedFollowUpAt.getTime())) {
      return NextResponse.json({ error: 'Invalid followUpAt date' }, { status: 400 });
    }

    const activity = await prisma.activity.create({
      data: {
        type: resolvedType,
        notes: trimmedNotes,
        occurredAt: parsedOccurredAt, // undefined falls back to schema default (now)
        followUpAt: parsedFollowUpAt,
        followUpStatus: parsedFollowUpAt ? followUpStatus || 'PENDING' : null,
        contactId: id,
        userId: user.id,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    revalidatePath('/');
    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Create activity error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}