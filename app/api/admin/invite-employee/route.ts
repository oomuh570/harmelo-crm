import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * Best-effort invitation email. Uses the Gmail creds set in .env.local
 * (GMAIL_USER + GMAIL_PASSWORD app password). If they're missing or the send
 * fails, we log and continue — the caller still receives inviteLink in the
 * response so the admin can copy/paste it manually.
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
    console.warn('[invite-employee] GMAIL_USER/GMAIL_PASSWORD not set; skipping email.');
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
    console.error('[invite-employee] Failed to send email:', err);
    return { sent: false, error: (err as Error).message };
  }
}

/**
 * GET /api/admin/invite-employee?list=true
 * List all invitations
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const list = searchParams.get('list');

    if (list !== 'true') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const invitations = await prisma.invitation.findMany({
      include: {
        invitedBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const transformed = invitations.map(inv => {
      let status: 'accepted' | 'expired' | 'pending';
      if (inv.acceptedAt) {
        status = 'accepted';
      } else if (inv.expiresAt < now) {
        status = 'expired';
      } else {
        status = 'pending';
      }

      return {
        id: inv.id,
        email: inv.email,
        role: inv.role,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        invitedBy: inv.invitedBy,
        status,
      };
    });

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Get invitations error:', error);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}

/**
 * POST /api/admin/invite-employee
 * Send invite email to new employee
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

    const { email, role } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Check if current user is admin and get their workspace
    const requester = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { superAdmin: true, workspace: true },
    });

    if (!requester?.superAdmin && requester?.role !== 'SUPER_ADMIN' && requester?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can invite employees' }, { status: 403 });
    }

    if (!requester?.workspaceId) {
      return NextResponse.json({ error: 'User has no workspace' }, { status: 400 });
    }

    const workspaceId = requester.workspaceId;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Check if invitation already pending
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        workspaceId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 });
    }

    // Create invitation (expires in 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role: role || 'VIEWER',
        workspaceId,
        invitedById: session.userId,
        expiresAt,
      },
      include: {
        invitedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    const inviteLink = `${process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/invite/${invitation.id}`;

    // Fire the email. If it fails we still return success with the link so the
    // admin can share it manually.
    const emailResult = await sendInvitationEmail({
      to: email,
      inviterName: requester.fullName,
      workspaceName: requester.workspace?.name ?? 'the workspace',
      inviteLink,
    });

    return NextResponse.json({
      success: true,
      invitation,
      inviteLink,
      emailSent: emailResult.sent,
      emailError: emailResult.error,
    });
  } catch (error) {
    console.error('Invite employee error:', error);
    return NextResponse.json({ error: 'Failed to invite employee' }, { status: 500 });
  }
}
