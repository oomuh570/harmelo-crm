/**
 * Individual Contact API Route Handler
 *
 * Handles GET (fetch single contact), PUT (update contact),
 * and DELETE (soft-delete or permanently delete contact).
 *
 * Soft-delete pattern: by default, DELETE sets deletedAt timestamp.
 * Permanent delete: pass ?permanent=true to DELETE to hard-delete from database.
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/contacts/[id]
 *
 * Retrieves a single contact by ID. Returns 404 if contact not found or soft-deleted.
 * Includes all non-deleted tags associated with the contact.
 */
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

/**
 * PUT /api/contacts/[id]
 *
 * Updates a single contact. All fields are optional (partial updates supported).
 * Only fields explicitly provided in the request body are updated.
 * Name and email, if provided, cannot be empty/whitespace-only.
 * Returns the updated contact.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Contact id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, phone, organization, jobTitle, type, address, notes } = body;

    // Name is required and cannot be empty
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    // Email is required and cannot be empty
    if (email !== undefined && (typeof email !== 'string' || email.trim().length === 0)) {
      return NextResponse.json({ error: 'Email cannot be empty' }, { status: 400 });
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
    if (email !== undefined) data.email = email.trim();
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

/**
 * DELETE /api/contacts/[id]
 *
 * Soft-deletes a contact by default (sets deletedAt timestamp).
 * Pass ?permanent=true to hard-delete from database (cannot be recovered).
 * Soft-deleted contacts are excluded from all list and search operations.
 * Returns { success: true, permanent: boolean } to indicate which delete occurred.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Contact id is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    // Soft-delete (default): marks contact as deleted but keeps data
    // Permanent delete (?permanent=true): removes contact from database entirely
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
