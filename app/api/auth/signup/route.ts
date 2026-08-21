import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, phoneNumber, password } = body;

    // Basic check that required fields are present
    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if any SuperAdmin exists
    const existingSuperAdmin = await prisma.superAdmin.findFirst();
    const isFirstUser = !existingSuperAdmin;

    let workspace;
    let userRole = 'VIEWER'; // Default role for new users

    if (isFirstUser) {
      // First user becomes the master admin
      userRole = 'SUPER_ADMIN';

      // Create a default workspace for the master admin
      workspace = await prisma.workspace.create({
        data: {
          name: `${fullName}'s Team`,
        },
      });
    }

    // Create the user
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phoneNumber: phoneNumber || null,
        password: hashedPassword,
        role: userRole,
        workspaceId: workspace?.id || null,
      },
    });

    // If this is the first user, create SuperAdmin entry and add to workspace
    if (isFirstUser) {
      await prisma.superAdmin.create({
        data: {
          userId: user.id,
        },
      });

      // Add user to the workspace they should own
      if (workspace) {
        await prisma.workspaceUser.create({
          data: {
            workspaceId: workspace.id,
            userId: user.id,
            role: 'ADMIN',
          },
        });
      }
    }

    // Create user metrics record
    await prisma.userMetrics.create({
      data: {
        userId: user.id,
      },
    });

    // Return the new user's id (never return the password)
    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
