import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * POST /api/workspaces/[id]/invite
 * Invite a user to a workspace
 * Only workspace ADMIN can invite
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: workspaceId } = await params;

    // Get user session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Parse request
    const { email, role } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Check if requester is ADMIN in this workspace
    const requesterRole = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId,
        userId: session.userId,
      },
    });

    if (!requesterRole || requesterRole.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can invite users' }, { status: 403 });
    }

    // Check if invitation already exists for this email
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        email,
        workspaceId,
      },
    });

    if (existingInvite) {
      return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 400 });
    }

    // Create invitation (default role: VIEWER)
    const inviteRole = role || 'VIEWER';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // expires in 7 days

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role: inviteRole,
        workspaceId,
        invitedById: session.userId,
        expiresAt,
      },
      include: {
        invitedBy: { select: { id: true, fullName: true } },
      },
    });

    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/invite/${invitation.id}`;

    return NextResponse.json({
      success: true,
      inviteLink,
      invitation,
    });
  } catch (error) {
    console.error('Invite user error:', error);
    return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 });
  }
}
