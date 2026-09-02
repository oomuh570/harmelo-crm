import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * PATCH /api/contacts/[id]/gmail-sync
 * Toggle Gmail sync for a specific contact
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[Gmail Sync API] Received request for contact:', id);

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      console.log('[Gmail Sync API] No session cookie');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      console.log('[Gmail Sync API] Invalid session');
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { gmailSyncEnabled } = body;
    console.log('[Gmail Sync API] Setting gmailSyncEnabled to:', gmailSyncEnabled);

    if (typeof gmailSyncEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'gmailSyncEnabled must be a boolean' },
        { status: 400 }
      );
    }

    // Get contact and verify user has access
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        workspace: {
          include: {
            users: {
              where: { userId: session.userId },
            },
          },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (!contact.workspace?.users || contact.workspace.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update contact
    const updated = await prisma.contact.update({
      where: { id },
      data: { gmailSyncEnabled },
    });

    return NextResponse.json({ success: true, contact: updated });
  } catch (error) {
    console.error('Toggle Gmail sync error:', error);
    return NextResponse.json({ error: 'Failed to update Gmail sync setting' }, { status: 500 });
  }
}
