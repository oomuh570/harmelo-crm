import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/server-data';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only super admins can invite users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, workspaceId, role } = body;

    if (!email || !workspaceId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, workspaceId, role' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['VIEWER', 'EDITOR', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be VIEWER, EDITOR, or ADMIN' },
        { status: 400 }
      );
    }

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Check if invitation already exists for this email in this workspace
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        workspaceId,
        acceptedAt: null,
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation already exists for this email in this workspace' },
        { status: 409 }
      );
    }

    // Create invitation with 30-day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        workspaceId,
        invitedById: user.id,
        expiresAt,
      },
    });

    // Generate invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invitation.id}`;

    return NextResponse.json({
      success: true,
      inviteLink,
      invitation,
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
