import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { encrypt } from '@/lib/session';

/**
 * POST /api/auth/accept-invite
 * Employee accepts invite & creates account
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { invitationId, fullName, password, phoneNumber } = body;

    console.log('[accept-invite] Request body:', { invitationId, fullName, password: '***', phoneNumber });

    if (!invitationId || !fullName || !password) {
      console.error('[accept-invite] Missing required fields:', { invitationId: !!invitationId, fullName: !!fullName, password: !!password });
      return NextResponse.json(
        { error: 'invitationId, fullName, and password required' },
        { status: 400 }
      );
    }

    // Get invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      console.error('[accept-invite] Invitation not found:', invitationId);
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      console.error('[accept-invite] Invitation expired:', invitation.email);
      return NextResponse.json({ error: 'Invitation expired' }, { status: 400 });
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      console.error('[accept-invite] Invitation already accepted:', invitation.email);
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      console.error('[accept-invite] User already exists:', invitation.email);
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with invitation role and workspace
    const user = await prisma.user.create({
      data: {
        fullName,
        email: invitation.email,
        phoneNumber: phoneNumber || null,
        password: hashedPassword,
        role: invitation.role,
        workspaceId: invitation.workspaceId,
      },
    });

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { acceptedAt: new Date() },
    });

    // Add user to the workspace
    await prisma.workspaceUser.create({
      data: {
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role as 'ADMIN' | 'EDITOR' | 'VIEWER',
      },
    });

    // Create user metrics record
    await prisma.userMetrics.create({
      data: {
        userId: user.id,
      },
    });

    // Create session and set cookie
    const cookieStore = await cookies();
    const session = encrypt(JSON.stringify({ userId: user.id }));
    cookieStore.set('session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      userId: user.id,
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}
