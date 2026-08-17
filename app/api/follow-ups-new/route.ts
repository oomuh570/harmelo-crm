import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * POST /api/follow-ups-new
 * Create follow-up task
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get workspace from authenticated user
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { workspaceId: true },
    });

    if (!currentUser?.workspaceId) {
      return NextResponse.json({ error: 'User has no workspace' }, { status: 400 });
    }

    const { contactId, assignedToUserId, dueDate, notes } = await request.json();

    if (!assignedToUserId || !dueDate) {
      return NextResponse.json(
        { error: 'assignedToUserId and dueDate required' },
        { status: 400 }
      );
    }

    // Verify contact exists if provided
    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!contact) {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      }
    }

    // Verify assigned user exists
    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedToUserId },
    });

    if (!assignedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create follow-up task
    const followUp = await prisma.followUpTask.create({
      data: {
        contactId: contactId || null,
        assignedToUserId,
        workspaceId: currentUser.workspaceId,
        dueDate: new Date(dueDate),
        notes: notes || null,
        status: 'PENDING',
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
      followUp,
    });
  } catch (error) {
    console.error('Create follow-up error:', error);
    return NextResponse.json({ error: 'Failed to create follow-up' }, { status: 500 });
  }
}

/**
 * GET /api/follow-ups-new
 * Get follow-ups (filter by status, assignee, date)
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assigneeId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    const where: any = {};

    if (status) where.status = status;
    if (assigneeId) where.assignedToUserId = assigneeId;

    if (fromDate || toDate) {
      where.dueDate = {};
      if (fromDate) where.dueDate.gte = new Date(fromDate);
      if (toDate) where.dueDate.lte = new Date(toDate);
    }

    const followUps = await prisma.followUpTask.findMany({
      where,
      include: {
        contact: {
          select: { id: true, name: true, organization: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({
      followUps,
      total: followUps.length,
    });
  } catch (error) {
    console.error('Get follow-ups error:', error);
    return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 });
  }
}
