import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/auth';

export async function DELETE(
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
      { error: 'Cannot revoke an accepted invitation' },
      { status: 400 },
    );
  }

  await prisma.userInvitation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
