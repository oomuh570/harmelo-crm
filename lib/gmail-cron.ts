import cron from 'node-cron';

let cronStarted = false;

export function initializeGmailCron() {
  if (cronStarted) {
    console.log('[gmail-cron] Cron already initialized');
    return;
  }

  // Schedule sync every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    try {
      console.log('[gmail-cron] Running scheduled Gmail sync...');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/cron/gmail-sync`);
      const result = await response.json();
      console.log('[gmail-cron] Sync result:', result);
    } catch (error) {
      console.error('[gmail-cron] Error running scheduled sync:', error);
    }
  });

  // Schedule follow-up reminders every hour
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[follow-up-reminder] Running scheduled reminder check...');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/cron/send-follow-up-reminders`);
      const result = await response.json();
      console.log('[follow-up-reminder] Reminder result:', result);
    } catch (error) {
      console.error('[follow-up-reminder] Error running scheduled reminders:', error);
    }
  });

  cronStarted = true;
  console.log('[cron] All scheduled tasks initialized');
}
