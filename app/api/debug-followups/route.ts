import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tasks = await prisma.followUpTask.findMany({
      select: { id: true, status: true, dueDate: true, reminderSentAt: true, notes: true },
      orderBy: { dueDate: 'desc' },
    });

    return NextResponse.json({ tasks, now: new Date() });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
