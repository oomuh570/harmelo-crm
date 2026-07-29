import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * GET /api/contacts/export?workspaceId=X
 * Export contacts to CSV
 * User must have access to workspace
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    const session = decrypt(sessionCookie);

    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    // Check workspace access
    const access = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId,
        userId: session.userId,
      },
    });

    if (!access) {
      return NextResponse.json({ error: 'No access to this workspace' }, { status: 403 });
    }

    // Get all contacts in workspace
    const contacts = await prisma.contact.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: {
        tags: {
          include: { tag: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build CSV
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Organization',
      'Job Title',
      'Type',
      'Address',
      'Tags',
    ];
    const rows = contacts.map((contact) => [
      contact.name,
      contact.email || '',
      contact.phone || '',
      contact.organization || '',
      contact.jobTitle || '',
      contact.type || '',
      contact.address || '',
      contact.tags.map((t) => t.tag.name).join('; '),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="contacts-${workspaceId}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export contacts' }, { status: 500 });
  }
}
