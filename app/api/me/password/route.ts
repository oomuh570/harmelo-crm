import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { requireUserApi } from '@/lib/auth';
import { PasswordSchema } from '@/auth/definitions';

export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const { currentPassword, newPassword } = body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const parsed = PasswordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Password does not meet requirements', issues: parsed.error.flatten().formErrors },
      { status: 400 },
    );
  }

  const user = await prisma.user.findFirst({
    where: { id: auth.user.id, deletedAt: null },
    select: { id: true, password: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const matches = await bcrypt.compare(currentPassword, user.password);
  if (!matches) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(parsed.data, 10);
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { password: hashed },
  });
  return NextResponse.json({ ok: true });
}
