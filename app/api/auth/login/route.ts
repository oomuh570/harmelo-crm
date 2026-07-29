import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Check required fields are present
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    // Look up the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // No user with that email
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Compare submitted password against the stored bcrypt hash
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Credentials are correct — create a session
    await createSession(user.id, user.email);

    // Return the user's id (never the password)
    return NextResponse.json({ id: user.id }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
