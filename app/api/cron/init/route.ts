import { initializeCronJobs } from '@/lib/cron-scheduler';
import { NextResponse } from 'next/server';

/**
 * Initialize cron jobs on app startup
 * GET /api/cron/init
 */
export async function GET() {
  try {
    initializeCronJobs();
    return NextResponse.json({ message: 'Cron jobs initialized' });
  } catch (error) {
    console.error('Failed to initialize cron jobs:', error);
    return NextResponse.json({ error: 'Failed to initialize cron jobs' }, { status: 500 });
  }
}
