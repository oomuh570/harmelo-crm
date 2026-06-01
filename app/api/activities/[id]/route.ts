import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Activity id is required' }, { status: 400 });
    }

    // Authenticate the caller from the session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const session = await decrypt(sessionCookie);

    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Read the ?permanent=true query flag (mirrors T20's pattern)
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    // For soft delete, only act on activities that aren't already deleted
    // For hard delete, any state is fine
    const existing = permanent
      ? await prisma.activity.findUnique({ where: { id } })
      : await prisma.activity.findFirst({ where: { id, deletedAt: null } });

    if (!existing) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    if (permanent) {
      await prisma.activity.delete({ where: { id } });
      return NextResponse.json({ success: true, permanent: true });
    } else {
      await prisma.activity.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return NextResponse.json({ success: true, permanent: false });
    }
  } catch (error) {
    console.error('Delete activity error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
