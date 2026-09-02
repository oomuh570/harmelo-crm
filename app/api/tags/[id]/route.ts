import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * DELETE /api/tags/[id]
 * Delete tag (soft delete)
 * User must be EDITOR+ in any workspace using this tag
 */
/**
 * PATCH /api/tags/[id]
 * Update tag name
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { workspaceId: true },
    });

    if (!user?.workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check if tag exists
    const tag = await prisma.tag.findFirst({
      where: { id, deletedAt: null },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Check for duplicate name (case-insensitive)
    const existing = await prisma.tag.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        deletedAt: null,
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      );
    }

    // Update tag
    const updated = await prisma.tag.update({
      where: { id },
      data: { name: trimmedName },
      include: {
        contacts: {
          where: { contact: { deletedAt: null, workspaceId: user.workspaceId } },
          select: { contactId: true },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      color: updated.color,
      contactCount: new Set(updated.contacts.map((c) => c.contactId)).size,
    });
  } catch (error) {
    console.error('Update tag error:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { workspaceId: true },
    });

    if (!user?.workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const tag = await prisma.tag.findFirst({
      where: { id, deletedAt: null },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Soft delete tag
    await prisma.tag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete tag error:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
