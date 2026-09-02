import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/server-data';

async function sendInvitationEmail(args: {
  to: string;
  inviterName: string;
  workspaceName: string;
  inviteLink: string;
}): Promise<{ sent: boolean; error?: string }> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASSWORD;
  if (!user || !pass) {
    console.warn('[super-admin-invite] GMAIL_USER/GMAIL_PASSWORD not set; skipping email.');
    return { sent: false, error: 'Email not configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: user,
      to: args.to,
      subject: `${args.inviterName} invited you to ${args.workspaceName} on Harmelo`,
      html: `
        <h2>You've been invited to Harmelo</h2>
        <p>${args.inviterName} added you to <strong>${args.workspaceName}</strong>.</p>
        <p>Click below to set your password and finish setting up your account:</p>
        <p><a href="${args.inviteLink}" style="display:inline-block;padding:10px 16px;background:#00D4B8;color:#000;text-decoration:none;border-radius:6px;font-weight:500;">Accept invitation</a></p>
        <p style="color:#666;font-size:13px;">Or paste this link into your browser: ${args.inviteLink}</p>
        <p style="color:#666;font-size:13px;">This link expires in 30 days.</p>
      `,
    });
    return { sent: true };
  } catch (err) {
    console.error('[super-admin-invite] Failed to send email:', err);
    return { sent: false, error: (err as Error).message };
  }
}

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

    // Send invitation email (best-effort, continues if it fails)
    const emailResult = await sendInvitationEmail({
      to: email,
      inviterName: user.fullName,
      workspaceName: workspace.name,
      inviteLink,
    });

    return NextResponse.json({
      success: true,
      inviteLink,
      invitation,
      emailSent: emailResult.sent,
      emailError: emailResult.error,
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
