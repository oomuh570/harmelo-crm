import { prisma } from '@/lib/prisma';
import { getMailer, getMailerFromAddress } from '@/lib/mailer';

/**
 * Send reminder emails for upcoming follow-ups
 * Checks for follow-ups scheduled for today or tomorrow
 * Only sends if reminder hasn't been sent yet
 */
export async function sendFollowUpReminders() {
  try {
    console.log('[Reminder Service] Starting follow-up reminder check...');

    // Get tomorrow's date (for reminders)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setHours(23, 59, 59, 999);

    // Find all follow-ups scheduled for tomorrow that haven't sent reminders
    const upcomingFollowUps = await prisma.activity.findMany({
      where: {
        followUpAt: {
          gte: tomorrow,
          lte: dayAfter,
        },
        reminderSent: false,
        deletedAt: null,
      },
      include: {
        contact: true,
        user: true,
      },
    });

    console.log(
      `[Reminder Service] Found ${upcomingFollowUps.length} follow-ups needing reminders`
    );

    const transporter = getMailer();
    if (!transporter) {
      console.warn('[Reminder Service] GMAIL_USER/GMAIL_PASSWORD not set; skipping email send.');
      return;
    }
    const fromAddress = getMailerFromAddress();

    // Send email for each follow-up
    for (const followUp of upcomingFollowUps) {
      try {
        // Format the follow-up date
        const followUpDate = new Date(followUp.followUpAt!).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });

        // Send email
        await transporter.sendMail({
          from: fromAddress,
          to: followUp.user.email,
          subject: `Reminder: Follow-up with ${(followUp.contact?.name ?? '(no contact)')} on ${followUpDate}`,
          html: `
            <h2>Follow-up Reminder</h2>
            <p>Hi ${followUp.user.fullName},</p>
            <p>This is a reminder that you have a follow-up scheduled:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
              <p><strong>Contact:</strong> ${(followUp.contact?.name ?? '(no contact)')}</p>
              <p><strong>Date:</strong> ${followUpDate}</p>
              ${followUp.notes ? `<p><strong>Notes:</strong> ${followUp.notes}</p>` : ''}
            </div>
            <p>Don't forget to reach out!</p>
            <p>Best regards,<br>Harmelo CRM</p>
          `,
        });

        // Mark reminder as sent
        await prisma.activity.update({
          where: { id: followUp.id },
          data: { reminderSent: true },
        });

        console.log(`[Reminder Service] Sent reminder for ${(followUp.contact?.name ?? '(no contact)')}`);
      } catch (error) {
        console.error(`[Reminder Service] Failed to send reminder:`, error);
      }
    }

    console.log('[Reminder Service] Reminder check completed');
  } catch (error) {
    console.error('[Reminder Service] Error:', error);
  }
}
