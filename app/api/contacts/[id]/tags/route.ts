import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Contact id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { tagIds } = body;

    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: 'tagIds must be an array' },
        { status: 400 }
      );
    }

    const contact = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Verify all tags exist
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

    // Delete all existing contact-tag relationships
    await prisma.contactTag.deleteMany({
      where: { contactId: id },
    });

    // Create new contact-tag relationships
    if (tagIds.length > 0) {
      await prisma.contactTag.createMany({
        data: tagIds.map((tagId) => ({
          contactId: id,
          tagId,
        })),
      });
    }

    // Fetch updated contact with tags
    const updated = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
      include: {
        tags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    });

    revalidatePath('/');
    revalidatePath('/contacts');
    return NextResponse.json({
      ...updated,
      tags: updated?.tags.map((ct) => ct.tag) ?? [],
    });
  } catch (error) {
    console.error('Update contact tags error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
