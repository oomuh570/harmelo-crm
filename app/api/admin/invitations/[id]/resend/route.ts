import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

async function sendInvitationEmail(args: {
  to: string;
  inviterName: string;
  workspaceName: string;
  inviteLink: string;
}): Promise<{ sent: boolean; error?: string }> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASSWORD;
  if (!user || !pass) {
    console.warn('[admin-resend] GMAIL_USER/GMAIL_PASSWORD not set; skipping email.');
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
      subject: `${args.inviterName} resent your invitation to ${args.workspaceName} on Harmelo`,
      html: `
        <h2>Your invitation has been resent</h2>
        <p>${args.inviterName} resent your invitation to <strong>${args.workspaceName}</strong>.</p>
        <p>Click below to set your password and finish setting up your account:</p>
        <p><a href="${args.inviteLink}" style="display:inline-block;padding:10px 16px;background:#00D4B8;color:#000;text-decoration:none;border-radius:6px;font-weight:500;">Accept invitation</a></p>
        <p style="color:#666;font-size:13px;">Or paste this link into your browser: ${args.inviteLink}</p>
        <p style="color:#666;font-size:13px;">This link expires in 30 days.</p>
      `,
    });
    return { sent: true };
  } catch (err) {
    console.error('[admin-resend] Failed to send email:', err);
    return { sent: false, error: (err as Error).message };
  }
}

/**
 * POST /api/admin/invitations/[id]/resend
 * Resend an invitation
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

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { superAdmin: true },
    });

    if (!user?.superAdmin && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can resend invitations' }, { status: 403 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      include: {
        workspace: { select: { name: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Update expiry to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const updated = await prisma.invitation.update({
      where: { id },
      data: { expiresAt },
      include: {
        invitedBy: { select: { id: true, fullName: true } },
        workspace: { select: { name: true } },
      },
    });

    const inviteLink = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/invite/${updated.id}`;

    // Send invitation email (best-effort, continues if it fails)
    const emailResult = await sendInvitationEmail({
      to: invitation.email,
      inviterName: user.fullName,
      workspaceName: invitation.workspace.name,
      inviteLink,
    });

    return NextResponse.json({
      success: true,
      invitation: updated,
      inviteLink,
      emailSent: emailResult.sent,
      emailError: emailResult.error,
    });
  } catch (error) {
    console.error('Resend invitation error:', error);
    return NextResponse.json({ error: 'Failed to resend invitation' }, { status: 500 });
  }
}
