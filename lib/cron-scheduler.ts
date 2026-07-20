import cron from 'node-cron';
import { sendFollowUpReminders } from './reminder-service';

/**
 * Initialize cron jobs for background tasks
 * Call this once when the app starts
 */
export function initializeCronJobs() {
  console.log('[Cron] Initializing scheduled jobs...');

  // Run reminder check every day at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] Running follow-up reminder job...');
    await sendFollowUpReminders();
  });

  console.log('[Cron] Follow-up reminder scheduled for 9 AM daily');
}
