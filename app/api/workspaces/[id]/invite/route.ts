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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already in workspace
    const existing = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId,
        userId: user.id,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'User already in workspace' }, { status: 400 });
    }

    // Invite user (default role: VIEWER)
    const inviteRole = role || 'VIEWER';
    const workspaceUser = await prisma.workspaceUser.create({
      data: {
        workspaceId,
        userId: user.id,
        role: inviteRole,
      },
    });

    return NextResponse.json({
      success: true,
      workspaceUser,
    });
  } catch (error) {
    console.error('Invite user error:', error);
    return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 });
  }
}
