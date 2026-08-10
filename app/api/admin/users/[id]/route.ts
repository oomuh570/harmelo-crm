import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/auth';
import { AdminUserEditSchema } from '@/auth/definitions';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const target = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Two mutually independent kinds of updates: role and/or profile fields.
  const wantsRoleChange = body.role !== undefined;
  const wantsProfileChange =
    body.fullName !== undefined ||
    body.email !== undefined ||
    body.phoneNumber !== undefined;

  if (!wantsRoleChange && !wantsProfileChange) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (wantsRoleChange) {
    const role = body.role;
    if (role !== 'ADMIN' && role !== 'MEMBER') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (target.role === 'ADMIN' && role === 'MEMBER') {
      if (target.id === auth.user.id) {
        return NextResponse.json(
          { error: 'You cannot demote yourself. Ask another admin to change your role.' },
          { status: 400 },
        );
      }
      const otherAdmins = await prisma.user.count({
        where: { role: 'ADMIN', deletedAt: null, NOT: { id: target.id } },
      });
      if (otherAdmins === 0) {
        return NextResponse.json(
          { error: 'Cannot demote the only admin' },
          { status: 400 },
        );
      }
    }
    data.role = role;
  }

  if (wantsProfileChange) {
    const parsed = AdminUserEditSchema.safeParse({
      fullName: body.fullName ?? target.fullName,
      phoneNumber: body.phoneNumber === '' ? null : body.phoneNumber ?? target.phoneNumber,
      email: body.email ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    if (body.fullName !== undefined) data.fullName = parsed.data.fullName;
    if (body.phoneNumber !== undefined) data.phoneNumber = parsed.data.phoneNumber ?? null;
    if (body.email !== undefined) {
      const emailLower = parsed.data.email!.toLowerCase();
      if (emailLower !== target.email.toLowerCase()) {
        const collision = await prisma.user.findFirst({
          where: { email: emailLower, NOT: { id: target.id } },
        });
        if (collision) {
          return NextResponse.json(
            { error: 'That email is already in use' },
            { status: 409 },
          );
        }
      }
      data.email = emailLower;
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      role: true,
      fullName: true,
      email: true,
      phoneNumber: true,
    },
  });
  return NextResponse.json({ user: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (id === auth.user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, role: true, email: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (target.role !== 'MEMBER') {
    return NextResponse.json(
      { error: 'Admins cannot be removed. Demote them to member first.' },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
