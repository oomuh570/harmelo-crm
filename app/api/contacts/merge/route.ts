import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * Merge two contacts together
 * fromContactId: contact to merge FROM (will be deleted)
 * toContactId: contact to merge INTO (will be kept)
 *
 * POST /api/contacts/merge
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
    if (!session?.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Parse request body
    const { fromContactId, toContactId } = await request.json();

    if (!fromContactId || !toContactId) {
      return NextResponse.json(
        { error: 'fromContactId and toContactId required' },
        { status: 400 }
      );
    }

    if (fromContactId === toContactId) {
      return NextResponse.json({ error: 'Cannot merge contact with itself' }, { status: 400 });
    }

    // Verify both contacts exist and are not deleted
    const [fromContact, toContact] = await Promise.all([
      prisma.contact.findFirst({
        where: { id: fromContactId, deletedAt: null },
      }),
      prisma.contact.findFirst({
        where: { id: toContactId, deletedAt: null },
      }),
    ]);

    if (!fromContact) {
      return NextResponse.json({ error: 'Source contact not found' }, { status: 404 });
    }

    if (!toContact) {
      return NextResponse.json({ error: 'Target contact not found' }, { status: 404 });
    }

    // Move all activities from fromContact to toContact
    const movedActivities = await prisma.activity.updateMany({
      where: { contactId: fromContactId, deletedAt: null },
      data: { contactId: toContactId },
    });

    // Get tags from fromContact
    const fromTags = await prisma.contactTag.findMany({
      where: { contactId: fromContactId },
    });

    // Add tags from fromContact to toContact (avoid duplicates)
    const toContactTags = await prisma.contactTag.findMany({
      where: { contactId: toContactId },
    });

    const existingTagIds = toContactTags.map((ct) => ct.tagId);
    const newTags = fromTags.filter((t) => !existingTagIds.includes(t.tagId));

    let mergedTagsCount = 0;
    if (newTags.length > 0) {
      // Bulk create new tag associations
      await prisma.contactTag.createMany({
        data: newTags.map((t) => ({
          contactId: toContactId,
          tagId: t.tagId,
        })),
        skipDuplicates: true,
      });
      mergedTagsCount = newTags.length;
    }

    // Delete tags from fromContact
    await prisma.contactTag.deleteMany({
      where: { contactId: fromContactId },
    });

    // Soft-delete the fromContact
    await prisma.contact.update({
      where: { id: fromContactId },
      data: { deletedAt: new Date() },
    });

    // Fetch updated toContact with tags
    const mergedContact = await prisma.contact.findUnique({
      where: { id: toContactId },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      mergedContact,
      activitiesMoved: movedActivities.count,
      tagsMerged: mergedTagsCount,
      deletedContactId: fromContactId,
    });
  } catch (error) {
    console.error('Merge error:', error);
    return NextResponse.json({ error: 'Failed to merge contacts' }, { status: 500 });
  }
}
