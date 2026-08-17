import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { revalidatePath } from 'next/cache';

/**
 * GET /api/activities?contactId=X&workspaceId=Y
 * Get activities for a contact
 * User must have access to contact's workspace
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const workspaceId = searchParams.get('workspaceId');

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const session = decrypt(sessionCookie);

    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    // Check workspace access
    const access = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId,
        userId: session.userId,
      },
    });

    if (!access) {
      return NextResponse.json({ error: 'No access to this workspace' }, { status: 403 });
    }

    // Get activities
    const where: any = {
      deletedAt: null,
      contact: { workspaceId },
    };

    if (contactId) {
      where.contactId = contactId;
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      include: {
        contact: true,
      },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Get activities error:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

/**
 * POST /api/activities
 * Create activity
 * User must be EDITOR+ in contact's workspace
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const session = decrypt(sessionCookie);

    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's workspace
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { workspaceId: true },
    });

    if (!user?.workspaceId) {
      return NextResponse.json({ error: 'User has no workspace' }, { status: 400 });
    }

    const body = await request.json();
    const { contactId, type, notes, occurredAt, followUpAt } = body;

    if (!type) {
      return NextResponse.json({ error: 'Activity type is required' }, { status: 400 });
    }

    if (!contactId) {
      return NextResponse.json({ error: 'Contact is required' }, { status: 400 });
    }

    // Verify contact exists
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, deletedAt: null },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Assign contact to workspace if not already assigned
    if (!contact.workspaceId) {
      await prisma.contact.update({
        where: { id: contactId },
        data: { workspaceId: user.workspaceId },
      });
    }

    const activity = await prisma.activity.create({
      data: {
        contactId: contactId || null,
        userId: session.userId,
        type,
        notes: notes || null,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        followUpAt: followUpAt ? new Date(followUpAt) : null,
      },
      include: {
        contact: true,
      },
    });

    revalidatePath('/contacts');
    revalidatePath('/activities');
    return NextResponse.json(activity);
  } catch (error) {
    console.error('Create activity error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Failed to create activity';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
