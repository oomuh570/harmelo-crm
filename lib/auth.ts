import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import type { UserRole } from '@/lib/generated/prisma/client';

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get('session')?.value);
  if (!session?.userId || typeof session.userId !== 'string') return null;

  const user = await prisma.user.findFirst({
    where: { id: session.userId, deletedAt: null },
    select: { id: true, email: true, fullName: true, role: true },
  });
  return user;
});

/** For server components/pages: redirects to / if not admin, to /login if not signed in. */
export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/');
  return user;
}

/** For API route handlers: returns a NextResponse to short-circuit on failure, or the user. */
export async function requireAdminApi(): Promise<
  { ok: true; user: CurrentUser } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }
  if (user.role !== 'ADMIN') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { ok: true, user };
}

/** For API routes needing just a signed-in user, returns Response on failure. */
export async function requireUserApi(): Promise<
  { ok: true; user: CurrentUser } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }
  return { ok: true, user };
}
