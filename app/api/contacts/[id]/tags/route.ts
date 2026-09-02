/**
 * Contact Tags API Route Handler
 *
 * Handles POST to assign/update tags for a contact.
 * This endpoint uses a replace-all pattern: it deletes all existing tag associations
 * and creates new ones based on the provided tagIds array.
 *
 * Body: { tagIds: string[] } - array of tag IDs to assign to the contact
 * Response: Contact with updated tags array
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * POST /api/contacts/[id]/tags
 *
 * Assigns tags to a contact. Uses a replace-all pattern:
 * 1. Deletes all existing ContactTag records for the contact
 * 2. Creates new ContactTag records for each tag in tagIds
 *
 * This ensures the contact has exactly the tags specified, no more, no less.
 * Passing an empty array removes all tags from the contact.
 *
 * Validates:
 * - Contact exists and is not soft-deleted
 * - All tags exist and are not soft-deleted
 * - tagIds is an array
 *
 * Returns the updated contact with full tag details.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Contact id is required' }, { status: 400 });
    }

    // Authenticate user
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
    const { tagIds } = body;

    // Validate tagIds is an array
    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: 'tagIds must be an array' },
        { status: 400 }
      );
    }

    // Verify contact exists, is not soft-deleted, and belongs to user's workspace
    const contact = await prisma.contact.findFirst({
      where: { id, deletedAt: null, workspaceId: user.workspaceId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Verify all provided tags exist and are not soft-deleted
    if (tagIds.length > 0) {
      const tagsExist = await prisma.tag.findMany({
        where: { id: { in: tagIds }, deletedAt: null },
      });

      if (tagsExist.length !== tagIds.length) {
        return NextResponse.json(
          { error: 'One or more tags do not exist' },
          { status: 400 }
        );
      }
    }

    // Step 1: Delete all existing contact-tag associations
    // This cleans up any previous tags before assigning new ones
    await prisma.contactTag.deleteMany({
      where: { contactId: id },
    });

    // Step 2: Create new contact-tag associations
    // tagIds can be empty (removes all tags) or contain one or more tag IDs
    if (tagIds.length > 0) {
      await prisma.contactTag.createMany({
        data: tagIds.map((tagId) => ({
          contactId: id,
          tagId,
        })),
      });
    }

    // Step 3: Fetch and return the updated contact with full tag details
    // This confirms the operation succeeded and provides the current state
    const updated = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    });

    // Revalidate pages so updated tag assignments are reflected immediately
    revalidatePath('/');
    revalidatePath('/contacts');

    return NextResponse.json({
      ...updated,
      // Flatten ContactTag relationship to return just the tag objects
      tags: updated?.tags.map((ct) => ct.tag) ?? [],
    });
  } catch (error) {
    console.error('Update contact tags error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
