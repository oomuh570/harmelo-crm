import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/server-data';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only super admins can delete workspaces' },
        { status: 403 }
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Delete all related records first (cascade)
    await prisma.user.updateMany({
      where: { workspaceId: id },
      data: { workspaceId: null },
    });

    await prisma.workspaceUser.deleteMany({
      where: { workspaceId: id },
    });

    await prisma.invitation.deleteMany({
      where: { workspaceId: id },
    });

    await prisma.followUpTask.deleteMany({
      where: { workspaceId: id },
    });

    // Delete activities for contacts in this workspace
    const contacts = await prisma.contact.findMany({
      where: { workspaceId: id },
      select: { id: true },
    });

    for (const contact of contacts) {
      await prisma.activity.deleteMany({
        where: { contactId: contact.id },
      });
    }

    await prisma.contact.deleteMany({
      where: { workspaceId: id },
    });

    // Now delete the workspace
    await prisma.workspace.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete workspace error:', error);
    return NextResponse.json(
      { error: 'Failed to delete workspace' },
      { status: 500 }
    );
  }
}
