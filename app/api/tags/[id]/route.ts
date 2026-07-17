import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Tag id is required' }, { status: 400 });
    }

    const tag = await prisma.tag.findFirst({
      where: { id, deletedAt: null },
      include: {
        contacts: {
          where: { contact: { deletedAt: null } },
          select: { contactId: true },
        },
      },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      contactCount: new Set(tag.contacts.map((c) => c.contactId)).size,
    });
  } catch (error) {
    console.error('Get tag error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Tag id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, color } = body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    const existing = await prisma.tag.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();
      const duplicate = await prisma.tag.findFirst({
        where: {
          name: { equals: trimmedName, mode: 'insensitive' },
          deletedAt: null,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A tag with this name already exists' },
          { status: 409 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (color !== undefined) data.color = color || '#6b7280';

    const updated = await prisma.tag.update({
      where: { id },
      data,
      include: {
        contacts: {
          where: { contact: { deletedAt: null } },
          select: { contactId: true },
        },
      },
    });

    revalidatePath('/tags');
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      color: updated.color,
      contactCount: new Set(updated.contacts.map((c) => c.contactId)).size,
    });
  } catch (error) {
    console.error('Update tag error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Tag id is required' }, { status: 400 });
    }

    const existing = await prisma.tag.findFirst({
      where: { id, deletedAt: null },
      include: {
        contacts: { select: { contactId: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    await prisma.tag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePath('/tags');
    return NextResponse.json({
      success: true,
      message: `Tag "${existing.name}" has been deleted`,
    });
  } catch (error) {
    console.error('Delete tag error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
