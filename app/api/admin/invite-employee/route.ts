import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';

/**
 * GET /api/admin/invite-employee?list=true
 * List all invitations
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const list = searchParams.get('list');

    if (list !== 'true') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const invitations = await prisma.invitation.findMany({
      include: {
        invitedBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const transformed = invitations.map(inv => {
      let status: 'accepted' | 'expired' | 'pending';
      if (inv.acceptedAt) {
        status = 'accepted';
      } else if (inv.expiresAt < now) {
        status = 'expired';
      } else {
        status = 'pending';
      }

      return {
        id: inv.id,
        email: inv.email,
        role: inv.role,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        invitedBy: inv.invitedBy,
        status,
      };
    });

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Get invitations error:', error);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}

/**
 * POST /api/admin/invite-employee
 * Send invite email to new employee
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { email, role } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Check if current user is admin and get their workspace
    const requester = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { superAdmin: true },
    });

    if (!requester?.superAdmin && requester?.role !== 'SUPER_ADMIN' && requester?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can invite employees' }, { status: 403 });
    }

    if (!requester?.workspaceId) {
      return NextResponse.json({ error: 'User has no workspace' }, { status: 400 });
    }

    const workspaceId = requester.workspaceId;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Check if invitation already pending
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        workspaceId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 });
    }

    // Create invitation (expires in 30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role: role || 'VIEWER',
        workspaceId,
        invitedById: session.userId,
        expiresAt,
      },
      include: {
        invitedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // TODO: Send invitation email
    // For now, return invitation link for manual sharing
    const inviteLink = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/invite/${invitation.id}`;

    return NextResponse.json({
      success: true,
      invitation,
      inviteLink,
    });
  } catch (error) {
    console.error('Invite employee error:', error);
    return NextResponse.json({ error: 'Failed to invite employee' }, { status: 500 });
  }
}
