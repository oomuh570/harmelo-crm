import cron from 'node-cron';

let cronJob: any = null;

export function initializeReminderCron() {
  if (cronJob) return;

  cronJob = cron.schedule('*/30 * * * *', async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/reminders`, {
        method: 'GET',
        headers: { 'User-Agent': 'Harmelo-Cron' },
      });

      if (!response.ok) {
        console.error('[Cron] Reminder check failed:', response.status);
      } else {
        const data = await response.json();
        if (data.sent > 0) {
          console.log(`[Cron] Sent ${data.sent} reminders at ${new Date().toISOString()}`);
        }
      }
    } catch (error) {
      console.error('[Cron] Error checking reminders:', error);
    }
  });

  console.log('[Cron] Reminder scheduler initialized (runs every 30 minutes)');
}

export function stopReminderCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
}
