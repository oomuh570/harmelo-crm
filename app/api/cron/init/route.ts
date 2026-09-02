import { initializeReminderCron } from '@/lib/cron-scheduler';
import { NextResponse } from 'next/server';

/**
 * Initialize cron jobs on app startup
 * GET /api/cron/init
 */
export async function GET() {
  try {
    initializeReminderCron();
    return NextResponse.json({ message: 'Reminder cron job initialized' });
  } catch (error) {
    console.error('Failed to initialize cron jobs:', error);
    return NextResponse.json({ error: 'Failed to initialize cron jobs' }, { status: 500 });
  }
}
