import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * PATCH /api/admin/team-members/[userId]
 * Update employee
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check if current user is admin
    const requester = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { superAdmin: true },
    });

    if (!requester?.superAdmin && requester?.role !== 'SUPER_ADMIN' && requester?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update employees' }, { status: 403 });
    }

    const { role, fullName, email, phoneNumber } = await request.json();

    // Prevent changing own role to non-admin
    if (session.userId === userId && role && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot remove yourself from admin' },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role && { role }),
        ...(fullName && { fullName }),
        ...(email && { email }),
        ...(phoneNumber !== undefined && { phoneNumber }),
      },
    });

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/team-members/[userId]
 * Remove employee
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Prevent removing yourself
    if (session.userId === userId) {
      return NextResponse.json(
        { error: 'Cannot remove yourself' },
        { status: 400 }
      );
    }

    // Check if current user is admin
    const requester = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { superAdmin: true },
    });

    if (!requester?.superAdmin && requester?.role !== 'SUPER_ADMIN' && requester?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can remove employees' }, { status: 403 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: 'Employee removed',
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json({ error: 'Failed to remove employee' }, { status: 500 });
  }
}
