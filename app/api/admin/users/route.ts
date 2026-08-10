import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/auth';

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    select: {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      role: true,
      createdAt: true,
    },
  });

  // Attach last activity timestamp per user
  const lastActivities = await prisma.activity.groupBy({
    by: ['userId'],
    where: { deletedAt: null },
    _max: { occurredAt: true },
  });
  const lastByUser = new Map(lastActivities.map((a) => [a.userId, a._max.occurredAt]));

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      lastActivityAt: lastByUser.get(u.id) ?? null,
    })),
  });
}
