import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Contact id is required' }, { status: 400 });
    }

    const contact = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
      include: {
        tags: {
          where: { tag: { deletedAt: null } },
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...contact,
      tags: contact.tags.map((ct) => ct.tag),
    });
  } catch (error) {
    console.error('Get contact error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Contact id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, phone, organization, jobTitle, type, address, notes } = body;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    const allowedTypes = [
      'FEDERAL',
      'PROVINCIAL',
      'US',
      'INVESTOR',
      'CUSTOMER',
      'PARTNER',
      'OTHER',
    ];
    if (type !== undefined && !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid contact type' }, { status: 400 });
    }

    const existing = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (email !== undefined) data.email = email || null;
    if (phone !== undefined) data.phone = phone || null;
    if (organization !== undefined) data.organization = organization || null;
    if (jobTitle !== undefined) data.jobTitle = jobTitle || null;
    if (type !== undefined) data.type = type;
    if (address !== undefined) data.address = address || null;
    if (notes !== undefined) data.notes = notes || null;

    const updated = await prisma.contact.update({
      where: { id },
      data,
    });

    revalidatePath('/');
    revalidatePath('/contacts');
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update contact error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Contact id is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    const existing = permanent
      ? await prisma.contact.findUnique({ where: { id } })
      : await prisma.contact.findFirst({ where: { id, deletedAt: null } });

    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (permanent) {
      await prisma.contact.delete({ where: { id } });
      revalidatePath('/');
      revalidatePath('/contacts');
      return NextResponse.json({ success: true, permanent: true });
    } else {
      await prisma.contact.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      revalidatePath('/');
      revalidatePath('/contacts');
      return NextResponse.json({ success: true, permanent: false });
    }
  } catch (error) {
    console.error('Delete contact error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
