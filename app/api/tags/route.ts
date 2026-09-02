/**
 * Tags API Route Handler
 *
 * Handles GET (list all non-deleted tags) and POST (create new tag).
 * Uses soft-delete pattern: deleted tags are excluded from queries (deletedAt is not null).
 *
 * Response format includes contactCount: the number of unique non-deleted contacts
 * assigned to each tag (deduplicated using Set).
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * GET /api/tags
 *
 * Retrieves all non-deleted tags sorted by name (ascending).
 * Each tag includes a contactCount showing how many unique non-deleted contacts use it.
 * Response: Tag[] = { id, name, color, contactCount }
 */
export async function GET() {
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

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { workspaceId: true },
    });

    if (!user?.workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const tags = await prisma.tag.findMany({
      where: { deletedAt: null },
      include: {
        contacts: {
          where: {
            contact: { deletedAt: null, workspaceId: user.workspaceId },
          },
          select: { contactId: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        contactCount: new Set(t.contacts.map((c) => c.contactId)).size,
      }))
    );
  } catch (error) {
    console.error('Get tags error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * POST /api/tags
 *
 * Creates a new tag. Name is required and must be unique (case-insensitive).
 * Color is optional and defaults to '#6b7280' if not provided.
 * Returns the created tag with status 201 and contactCount of 0.
 * Revalidates /tags page cache.
 */
export async function POST(request: Request) {
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

    const body = await request.json();
    const { name, color } = body;

    // Name is required and cannot be empty or whitespace-only
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check for duplicate tag name (case-insensitive) among non-deleted tags
    const existing = await prisma.tag.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        name: trimmedName,
        color: color && typeof color === 'string' ? color : '#6b7280',
      },
    });

    revalidatePath('/tags');
    return NextResponse.json(
      {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        contactCount: 0,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create tag error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
