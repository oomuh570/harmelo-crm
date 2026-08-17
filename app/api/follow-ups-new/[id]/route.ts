import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * PATCH /api/follow-ups-new/[id]
 * Update follow-up
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { status, dueDate, notes, assignedToUserId } = await request.json();

    const updated = await prisma.followUpTask.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(notes !== undefined && { notes }),
        ...(assignedToUserId && { assignedToUserId }),
      },
      include: {
        contact: true,
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      followUp: updated,
    });
  } catch (error) {
    console.error('Update follow-up error:', error);
    return NextResponse.json({ error: 'Failed to update follow-up' }, { status: 500 });
  }
}

/**
 * PATCH /api/follow-ups-new/[id]/complete
 * Mark follow-up as complete
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'complete') {
      const updated = await prisma.followUpTask.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        followUp: updated,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Complete follow-up error:', error);
    return NextResponse.json({ error: 'Failed to complete follow-up' }, { status: 500 });
  }
}

/**
 * DELETE /api/follow-ups-new/[id]
 * Delete follow-up
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    await prisma.followUpTask.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Follow-up deleted',
    });
  } catch (error) {
    console.error('Delete follow-up error:', error);
    return NextResponse.json({ error: 'Failed to delete follow-up' }, { status: 500 });
  }
}
