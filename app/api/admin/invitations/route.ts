import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/auth';
import { getMailer, getMailerFromAddress } from '@/lib/mailer';

const INVITE_TTL_DAYS = 7;

function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function inviteExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + INVITE_TTL_DAYS);
  return d;
}

function buildInviteUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/signup?token=${encodeURIComponent(token)}`;
}

async function sendInviteEmail(email: string, inviterName: string, link: string) {
  const transporter = getMailer();
  if (!transporter) {
    console.warn(`[Invitations] GMAIL not configured. Invite link for ${email}: ${link}`);
    return;
  }
  await transporter.sendMail({
    from: getMailerFromAddress(),
    to: email,
    subject: `${inviterName} invited you to Harmelo CRM`,
    html: `
      <h2>You've been invited to Harmelo CRM</h2>
      <p>${inviterName} added you to the team. Click the link below to set up your account:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in ${INVITE_TTL_DAYS} days.</p>
    `,
  });
}

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const invitations = await prisma.userInvitation.findMany({
    orderBy: { createdAt: 'desc' },
    include: { invitedBy: { select: { id: true, fullName: true, email: true } } },
  });

  const now = new Date();
  return NextResponse.json({
    invitations: invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt,
      invitedBy: inv.invitedBy,
      status: inv.acceptedAt ? 'accepted' : inv.expiresAt < now ? 'expired' : 'pending',
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role === 'ADMIN' ? 'ADMIN' : 'MEMBER';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  const existingPending = await prisma.userInvitation.findFirst({
    where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (existingPending) {
    return NextResponse.json(
      { error: 'A pending invitation already exists for this email' },
      { status: 409 },
    );
  }

  const invitation = await prisma.userInvitation.create({
    data: {
      email,
      token: newToken(),
      role,
      invitedById: auth.user.id,
      expiresAt: inviteExpiresAt(),
    },
  });

  await sendInviteEmail(email, auth.user.fullName, buildInviteUrl(invitation.token));

  return NextResponse.json(
    {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      // Include link so admin can copy/paste when email isn't configured
      inviteLink: buildInviteUrl(invitation.token),
    },
    { status: 201 },
  );
}
