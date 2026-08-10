import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/auth';
import { getMailer, getMailerFromAddress } from '@/lib/mailer';

const INVITE_TTL_DAYS = 7;

function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function buildInviteUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/signup?token=${encodeURIComponent(token)}`;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const invitation = await prisma.userInvitation.findUnique({ where: { id } });
  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }
  if (invitation.acceptedAt) {
    return NextResponse.json(
      { error: 'Cannot resend an accepted invitation' },
      { status: 400 },
    );
  }

  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + INVITE_TTL_DAYS);

  const updated = await prisma.userInvitation.update({
    where: { id },
    data: { token: newToken(), expiresAt: newExpiry },
  });

  const link = buildInviteUrl(updated.token);
  const transporter = getMailer();
  if (transporter) {
    await transporter.sendMail({
      from: getMailerFromAddress(),
      to: updated.email,
      subject: `${auth.user.fullName} re-sent your Harmelo invitation`,
      html: `
        <h2>Your invitation link (renewed)</h2>
        <p><a href="${link}">${link}</a></p>
        <p>This link expires in ${INVITE_TTL_DAYS} days.</p>
      `,
    });
  } else {
    console.warn(`[Invitations] GMAIL not configured. Renewed link for ${updated.email}: ${link}`);
  }

  return NextResponse.json({ ok: true, inviteLink: link, expiresAt: updated.expiresAt });
}
