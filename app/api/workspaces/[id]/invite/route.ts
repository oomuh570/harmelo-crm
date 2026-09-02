import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * Best-effort invitation email. Uses Gmail credentials from .env.local.
 * If email fails, continues — caller still gets inviteLink to share manually.
 */
async function sendInvitationEmail(args: {
  to: string;
  inviterName: string;
  workspaceName: string;
  inviteLink: string;
}): Promise<{ sent: boolean; error?: string }> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASSWORD;
  if (!user || !pass) {
    console.warn('[workspace-invite] GMAIL_USER/GMAIL_PASSWORD not set; skipping email.');
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
        <p style="color:#666;font-size:13px;">This link expires in 7 days.</p>
      `,
    });
    return { sent: true };
  } catch (err) {
    console.error('[workspace-invite] Failed to send email:', err);
    return { sent: false, error: (err as Error).message };
  }
}

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
        workspace: { select: { name: true } },
      },
    });

    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/invite/${invitation.id}`;

    // Send invitation email (best-effort, continues if it fails)
    const emailResult = await sendInvitationEmail({
      to: email,
      inviterName: invitation.invitedBy.fullName,
      workspaceName: invitation.workspace.name,
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
    console.error('Invite user error:', error);
    return NextResponse.json({ error: 'Failed to invite user' }, { status: 500 });
  }
}
