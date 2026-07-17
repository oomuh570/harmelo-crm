import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Activity id is required' }, { status: 400 });
    }

    // Authenticate the caller from the session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const session = await decrypt(sessionCookie);

    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only edit activities that aren't soft-deleted
    const existing = await prisma.activity.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, type: true, notes: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Read and validate the request body
    const body = await request.json();
    const { type, notes, followUpAt, followUpStatus } = body;

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      return NextResponse.json({ error: 'Notes must be a string' }, { status: 400 });
    }

    const allowedTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE'];
    if (type && !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
    }

    // NOTE-type activities must have non-empty notes. Check the effective
    // post-update values, since this is a partial update.
    const effectiveType = type ?? existing.type;
    const effectiveNotes =
      notes !== undefined ? (typeof notes === 'string' ? notes.trim() : '') : existing.notes;
    if (effectiveType === 'NOTE' && effectiveNotes.length === 0) {
      return NextResponse.json(
        { error: 'Notes are required for a note activity' },
        { status: 400 },
      );
    }

    // Validate followUpStatus if sent (partial update — only enforced when present)
    const allowedFollowUpStatuses = ['PENDING', 'COMPLETED', 'CANCELLED'];
    if (
      followUpStatus !== undefined &&
      followUpStatus !== null &&
      !allowedFollowUpStatuses.includes(followUpStatus)
    ) {
      return NextResponse.json({ error: 'Invalid followUpStatus' }, { status: 400 });
    }

    const parsedFollowUpAt = followUpAt ? new Date(followUpAt) : null;
    if (parsedFollowUpAt && isNaN(parsedFollowUpAt.getTime())) {
      return NextResponse.json({ error: 'Invalid followUpAt date' }, { status: 400 });
    }

    // Build the update data.
    // Invariant from design doc: if followUpAt is null, followUpStatus must also be null.
    const data: Record<string, unknown> = {};

    if (type !== undefined) data.type = type;
    if (notes !== undefined) data.notes = typeof notes === 'string' ? notes.trim() : '';
    if (followUpAt !== undefined) data.followUpAt = parsedFollowUpAt;

    // followUpStatus rules:
    // - If followUpAt is being cleared, force followUpStatus to null.
    // - Otherwise, only update it if explicitly sent.
    if (followUpAt !== undefined && parsedFollowUpAt === null) {
      data.followUpStatus = null;
    } else if (followUpStatus !== undefined) {
      data.followUpStatus = followUpStatus;
    }

    const activity = await prisma.activity.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
        contact: {
          select: { id: true, name: true, organization: true, type: true },
        },
      },
    });

    revalidatePath('/');
    return NextResponse.json(activity);
  } catch (error) {
    console.error('Update activity error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Activity id is required' }, { status: 400 });
    }
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const session = await decrypt(sessionCookie);

    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    const existing = permanent
      ? await prisma.activity.findUnique({ where: { id } })
      : await prisma.activity.findFirst({ where: { id, deletedAt: null } });

    if (!existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    if (permanent) {
      await prisma.activity.delete({ where: { id } });
      revalidatePath('/');
      return NextResponse.json({ success: true, permanent: true });
    } else {
      await prisma.activity.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      revalidatePath('/');
      return NextResponse.json({ success: true, permanent: false });
    }
  } catch (error) {
    console.error('Delete activity error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}