import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

export async function GET() {
  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const pendingReminders = await prisma.followUpTask.findMany({
      where: {
        status: 'PENDING',
        dueDate: {
          gt: now,
          lte: oneHourFromNow,
        },
        reminderSentAt: null,
      },
      include: {
        assignedTo: {
          select: { email: true, fullName: true },
        },
        contact: {
          select: { name: true },
        },
      },
    });

    let sent = 0;

    for (const reminder of pendingReminders) {
      if (!reminder.contact) {
        console.log(`[Reminders] Skipping reminder ${reminder.id} - no contact`);
        continue;
      }

      try {
        const mailOptions = {
          from: process.env.EMAIL_FROM,
          to: reminder.assignedTo.email,
          subject: `Follow-up Reminder: ${reminder.contact.name}`,
          html: `
            <h2>Follow-up Reminder</h2>
            <p>Hi ${reminder.assignedTo.fullName},</p>
            <p>You have a follow-up due soon:</p>
            <p><strong>Contact:</strong> ${reminder.contact.name}</p>
            <p><strong>Due Date:</strong> ${reminder.dueDate.toLocaleDateString()}</p>
            <p><strong>Notes:</strong> ${reminder.notes || 'No notes'}</p>
            <p>Log in to Harmelo CRM to complete this task.</p>
          `,
        };

        await transporter.sendMail(mailOptions);

        await prisma.followUpTask.update({
          where: { id: reminder.id },
          data: { reminderSentAt: new Date() },
        });

        sent++;
      } catch (error) {
        console.error(`Failed to send reminder for task ${reminder.id}:`, error);
      }
    }

    return NextResponse.json({ sent, total: pendingReminders.length });
  } catch (error) {
    console.error('Reminders error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process reminders' },
      { status: 500 }
    );
  }
}
