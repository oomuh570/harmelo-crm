import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

/**
 * GET /api/cron/send-follow-up-reminders
 * Send email reminders for follow-ups due in the next 24 hours
 * Called hourly by cron job
 */
export async function GET() {
  try {
    console.log('[cron-reminders] Starting follow-up reminder check...');

    const now = new Date();
    const tomorrowPlus1Hour = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Find follow-ups due in next 24 hours that haven't been reminded yet
    const upcomingFollowUps = await prisma.followUpTask.findMany({
      where: {
        status: 'PENDING',
        dueDate: {
          gte: now,
          lte: tomorrowPlus1Hour,
        },
        reminderSentAt: null,
      },
      include: {
        assignedTo: true,
        contact: true,
      },
    });

    console.log(`[cron-reminders] Found ${upcomingFollowUps.length} follow-ups needing reminders`);

    let remindersCount = 0;

    for (const followUp of upcomingFollowUps) {
      try {
        // Send email reminder
        const emailSent = await sendReminderEmail(followUp);

        if (emailSent) {
          // Mark as reminder sent
          await prisma.followUpTask.update({
            where: { id: followUp.id },
            data: { reminderSentAt: new Date() },
          });
          remindersCount++;
        }
      } catch (error) {
        console.error(`[cron-reminders] Error sending reminder for ${followUp.id}:`, error);
      }
    }

    console.log(`[cron-reminders] Sent ${remindersCount} reminders`);

    return NextResponse.json({
      success: true,
      upcomingFollowUps: upcomingFollowUps.length,
      remindersSent: remindersCount,
    });
  } catch (error) {
    console.error('[cron-reminders] Error:', error);
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 });
  }
}

async function sendReminderEmail(followUp: any): Promise<boolean> {
  try {
    // Only send if email service is configured
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
      console.log('[cron-reminders] Email not configured, skipping reminder');
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const dueDate = followUp.dueDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const subject = `Follow-up reminder: ${followUp.contact?.name || 'Contact'}`;
    const html = `
      <h2>Follow-up Reminder</h2>
      <p>You have an upcoming follow-up with <strong>${followUp.contact?.name || 'Contact'}</strong></p>
      <p><strong>Due:</strong> ${dueDate}</p>
      <p><strong>Notes:</strong> ${followUp.notes || 'No notes'}</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/activities">View Follow-up</a></p>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: followUp.assignedTo.email,
      subject,
      html,
    });

    console.log(`[cron-reminders] Email sent to ${followUp.assignedTo.email}`);
    return true;
  } catch (error) {
    console.error('[cron-reminders] Error sending email:', error);
    return false;
  }
}
