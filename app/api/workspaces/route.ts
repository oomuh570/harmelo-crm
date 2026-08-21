import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/workspaces
 * Create a new workspace
 */
export async function POST(request: Request) {
  try {
    // Get user session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Verify user is SUPER_ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only super admins can create workspaces' },
        { status: 403 }
      );
    }

    // Parse request
    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Workspace name required' }, { status: 400 });
    }

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: { name },
    });

    // Add creator as ADMIN and set as their current workspace
    await prisma.workspaceUser.create({
      data: {
        workspaceId: workspace.id,
        userId: session.userId,
        role: 'ADMIN',
      },
    });

    await prisma.user.update({
      where: { id: session.userId },
      data: { workspaceId: workspace.id },
    });

    revalidatePath('/', 'layout');

    return NextResponse.json({
      success: true,
      workspace,
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
}

/**
 * GET /api/workspaces
 * List user's workspaces
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get all workspaces for this user
    const workspaces = await prisma.workspaceUser.findMany({
      where: { userId: session.userId },
      include: {
        workspace: true,
      },
    });

    return NextResponse.json(workspaces);
  } catch (error) {
    console.error('Get workspaces error:', error);
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
  }
}
