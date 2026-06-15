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
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Read and validate the request body
    const body = await request.json();
    const { type, notes, followUpAt } = body;

    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 });
    }

    const allowedTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE'];
    if (type && !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
    }

    const parsedFollowUpAt = followUpAt ? new Date(followUpAt) : null;
    if (parsedFollowUpAt && isNaN(parsedFollowUpAt.getTime())) {
      return NextResponse.json({ error: 'Invalid followUpAt date' }, { status: 400 });
    }

    const activity = await prisma.activity.update({
      where: { id },
      data: {
        type: type || 'NOTE',
        notes: notes.trim(),
        followUpAt: parsedFollowUpAt,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
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

    // Authenticate the caller from the session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const session = await decrypt(sessionCookie);

    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Read the ?permanent=true query flag (mirrors T20's pattern)
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    // For soft delete, only act on activities that aren't already deleted
    // For hard delete, any state is fine
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
