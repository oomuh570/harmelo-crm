import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUserApi } from '@/lib/auth';
import { ProfileSchema } from '@/auth/definitions';

export async function GET() {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const user = await prisma.user.findFirst({
    where: { id: auth.user.id, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      role: true,
      createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = ProfileSchema.safeParse({
    fullName: body.fullName,
    phoneNumber: body.phoneNumber === '' ? null : body.phoneNumber,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      fullName: parsed.data.fullName,
      phoneNumber: parsed.data.phoneNumber ?? null,
    },
    select: { id: true, fullName: true, email: true, phoneNumber: true, role: true },
  });
  return NextResponse.json({ user: updated });
}
