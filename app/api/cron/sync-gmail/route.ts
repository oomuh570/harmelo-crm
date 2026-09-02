import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/session';

/**
 * GET /api/cron/sync-gmail
 *
 * Automatic cron job to sync Gmail for all users with Gmail connected.
 * Call this every hour from an external cron service (e.g., EasyCron, Vercel Cron, etc.)
 *
 * Protected by CRON_SECRET in environment variables.
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Gmail Cron] Starting sync for all users...');

    // Get all users with Gmail connected
    const usersToSync = await prisma.user.findMany({
      where: { gmailConnected: true },
      select: { id: true, gmailRefreshToken: true },
    });

    console.log(`[Gmail Cron] Found ${usersToSync.length} users with Gmail connected`);

    let totalSynced = 0;
    let successCount = 0;
    let failureCount = 0;

    // Sync for each user
    for (const user of usersToSync) {
      try {
        const synced = await syncUserGmail(user.id, user.gmailRefreshToken!);
        totalSynced += synced;
        successCount++;
      } catch (error) {
        console.error(`[Gmail Cron] Failed to sync user ${user.id}:`, error);
        failureCount++;
      }
    }

    console.log(`[Gmail Cron] Sync complete. Total emails synced: ${totalSynced}, Success: ${successCount}, Failed: ${failureCount}`);

    return NextResponse.json({
      success: true,
      usersProcessed: usersToSync.length,
      successCount,
      failureCount,
      totalEmailsSynced: totalSynced,
    });
  } catch (error) {
    console.error('[Gmail Cron] Fatal error:', error);
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}

/**
 * Sync Gmail for a specific user
 */
async function syncUserGmail(userId: string, encryptedToken: string): Promise<number> {
  try {
    const refreshToken = decryptToken(encryptedToken);
    if (!refreshToken) throw new Error('Failed to decrypt token');

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Gmail not configured');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch emails
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
    });

    const messages = messagesResponse.data.messages || [];
    let syncedCount = 0;

    // Get all workspaces for this user
    const userWorkspaces = await prisma.workspaceUser.findMany({
      where: { userId },
      select: { workspaceId: true },
    });

    const workspaceIds = userWorkspaces.map(w => w.workspaceId);

    // Process each email
    for (const message of messages) {
      if (!message.id) continue;

      try {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full',
        });

        const headers = fullMessage.data.payload?.headers || [];
        const from = headers.find((h) => h.name === 'From')?.value || '';
        const subject = headers.find((h) => h.name === 'Subject')?.value || '';
        const dateStr = headers.find((h) => h.name === 'Date')?.value || '';

        const fromEmail = from.match(/<([^>]+)>/)?.[1] || from.trim();

        // Check if already logged
        const existing = await prisma.activity.findFirst({
          where: { externalEmailId: message.id, deletedAt: null },
        });

        if (existing) continue;

        // Find contact in any of user's workspaces
        const contact = await prisma.contact.findFirst({
          where: {
            email: fromEmail,
            workspaceId: { in: workspaceIds },
            deletedAt: null,
            OR: [
              { gmailSyncEnabled: true },
              { gmailSyncEnabled: null },
            ],
          },
        });

        if (contact) {
          const body = getEmailBody(fullMessage.data.payload);

          await prisma.activity.create({
            data: {
              contactId: contact.id,
              userId,
              type: 'EMAIL',
              notes: `From: ${from}\nSubject: ${subject}\n\n${body}`,
              occurredAt: new Date(dateStr || Date.now()),
              externalEmailId: message.id,
              isAutoLogged: true,
            },
          });

          syncedCount++;
        }
      } catch (error) {
        console.error(`[Gmail Cron] Failed to process message ${message.id}:`, error);
      }
    }

    // Update last sync time
    await prisma.user.update({
      where: { id: userId },
      data: { gmailLastSync: new Date() },
    });

    return syncedCount;
  } catch (error) {
    throw error;
  }
}

/**
 * Extract email body from Gmail payload
 */
function getEmailBody(payload: any): string {
  if (!payload) return '';

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        return html.replace(/<[^>]*>/g, '');
      }
    }
  }

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  return '';
}
