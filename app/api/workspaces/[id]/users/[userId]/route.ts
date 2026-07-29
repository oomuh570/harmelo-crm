import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * PUT /api/workspaces/[id]/users/[userId]
 * Update user role in workspace
 * Only workspace ADMIN can change roles
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: workspaceId, userId } = await params;

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
    const { role } = await request.json();

    if (!role || !['ADMIN', 'EDITOR', 'VIEWER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if requester is ADMIN in this workspace
    const requesterRole = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId,
        userId: session.userId,
      },
    });

    if (!requesterRole || requesterRole.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 });
    }

    // Prevent changing own role to non-admin
    if (session.userId === userId && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Cannot remove yourself from admin' }, { status: 400 });
    }

    // Update user role
    const updated = await prisma.workspaceUser.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      data: {
        role,
      },
    });

    return NextResponse.json({
      success: true,
      workspaceUser: updated,
    });
  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

/**
 * DELETE /api/workspaces/[id]/users/[userId]
 * Remove user from workspace
 * Only workspace ADMIN can remove users
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: workspaceId, userId } = await params;

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

    // Check if requester is ADMIN
    const requesterRole = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId,
        userId: session.userId,
      },
    });

    if (!requesterRole || requesterRole.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can remove users' }, { status: 403 });
    }

    // Prevent removing yourself
    if (session.userId === userId) {
      return NextResponse.json({ error: 'Cannot remove yourself from workspace' }, { status: 400 });
    }

    // Remove user from workspace
    await prisma.workspaceUser.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User removed from workspace',
    });
  } catch (error) {
    console.error('Remove user error:', error);
    return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
  }
}
