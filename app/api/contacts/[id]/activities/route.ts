import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { revalidatePath } from 'next/cache';

/**
 * GET /api/contacts/[id]
 * Get single contact
 * User must have access to contact's workspace
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const session = decrypt(sessionCookie);

    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const contact = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
      include: {
        tags: { include: { tag: true } },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (!contact.workspaceId) {
      return NextResponse.json({ error: 'Contact has no workspace' }, { status: 400 });
    }

    // Check workspace access
    const access = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: contact.workspaceId,
        userId: session.userId,
      },
    });

    if (!access) {
      return NextResponse.json({ error: 'No access to this contact' }, { status: 403 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Get contact error:', error);
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
  }
}

/**
 * PUT /api/contacts/[id]
 * Update contact
 * User must be EDITOR+ in contact's workspace
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const session = decrypt(sessionCookie);

    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const contact = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (!contact.workspaceId) {
      return NextResponse.json({ error: 'Contact has no workspace' }, { status: 400 });
    }

    // Check workspace access (must be EDITOR+)
    const access = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: contact.workspaceId,
        userId: session.userId,
      },
    });

    if (!access || (access.role !== 'EDITOR' && access.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Only editors can update contacts' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, organization, jobTitle, type, address, notes } = body;

    if (name && !name.trim()) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    if (email && !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        email: email ? email.trim() : undefined,
        phone: phone ? phone.trim() : undefined,
        organization: organization ? organization.trim() : undefined,
        jobTitle: jobTitle ? jobTitle.trim() : undefined,
        type: type || undefined,
        address: address ? address.trim() : undefined,
        notes: notes ? notes.trim() : undefined,
      },
      include: {
        tags: { include: { tag: true } },
      },
    });

    revalidatePath('/contacts');
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update contact error:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

/**
 * DELETE /api/contacts/[id]
 * Delete contact (soft delete)
 * User must be EDITOR+ in contact's workspace
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const session = decrypt(sessionCookie);

    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const contact = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (!contact.workspaceId) {
      return NextResponse.json({ error: 'Contact has no workspace' }, { status: 400 });
    }

    // Check workspace access (must be EDITOR+)
    const access = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId: contact.workspaceId,
        userId: session.userId,
      },
    });

    if (!access || (access.role !== 'EDITOR' && access.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Only editors can delete contacts' }, { status: 403 });
    }

    await prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    revalidatePath('/contacts');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete contact error:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
