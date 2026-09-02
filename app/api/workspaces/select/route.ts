import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const { workspaceId } = await request.json();
    
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Update user's workspace
    await prisma.user.update({
      where: { id: session.userId },
      data: { workspaceId },
    });

    return NextResponse.json({ success: true, workspaceId });
  } catch (error) {
    console.error('Select workspace error:', error);
    return NextResponse.json(
      { error: 'Failed to select workspace' },
      { status: 500 }
    );
  }
}
