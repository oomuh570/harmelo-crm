import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      where: { deletedAt: null },
      include: {
        contacts: {
          where: { contact: { deletedAt: null } },
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

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
