import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, phoneNumber, password, token } = body;

    if (!fullName || !email || !password || !token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate invitation
    const invitation = await prisma.userInvitation.findUnique({
      where: { token },
    });
    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 400 });
    }
    if (invitation.acceptedAt) {
      return NextResponse.json({ error: 'Invitation already used' }, { status: 400 });
    }
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation expired' }, { status: 400 });
    }
    if (invitation.email.toLowerCase() !== String(email).toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match invitation' },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          fullName,
          email,
          phoneNumber: phoneNumber || null,
          password: hashedPassword,
          role: invitation.role,
        },
      });
      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return created;
    });

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
