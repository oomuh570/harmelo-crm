import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { decryptToken } from '@/lib/session';

/**
 * GET /api/cron/gmail-sync
 * Internal endpoint for syncing Gmail for all users with connected Gmail
 * Called hourly by cron job
 */
export async function GET() {
  try {
    console.log('[cron-gmail-sync] Starting automatic Gmail sync...');

    // Find all users with Gmail connected
    const usersWithGmail = await prisma.user.findMany({
      where: { gmailRefreshToken: { not: null } },
      select: {
        id: true,
        gmailRefreshToken: true,
        workspaceId: true,
      },
    });

    console.log(`[cron-gmail-sync] Found ${usersWithGmail.length} users with Gmail connected`);

    let totalSynced = 0;

    // Sync each user
    for (const user of usersWithGmail) {
      if (!user.workspaceId) {
        console.log(`[cron-gmail-sync] Skipping user ${user.id} - no workspace`);
        continue;
      }

      try {
        const syncCount = await syncUserGmail(user.id, user.gmailRefreshToken, user.workspaceId);
        totalSynced += syncCount;
        console.log(`[cron-gmail-sync] User ${user.id}: synced ${syncCount} emails`);
      } catch (error) {
        console.error(`[cron-gmail-sync] Error syncing user ${user.id}:`, error);
      }
    }

    console.log(`[cron-gmail-sync] Auto-sync complete. Total emails synced: ${totalSynced}`);

    return NextResponse.json({
      success: true,
      usersProcessed: usersWithGmail.length,
      totalEmailsSynced: totalSynced,
    });
  } catch (error) {
    console.error('[cron-gmail-sync] Error:', error);
    return NextResponse.json({ error: 'Failed to sync Gmail' }, { status: 500 });
  }
}

async function syncUserGmail(userId: string, encryptedToken: string, workspaceId: string): Promise<number> {
  try {
    // Decrypt refresh token
    const refreshToken = decryptToken(encryptedToken);
    if (!refreshToken) {
      throw new Error('Failed to decrypt refresh token');
    }

    // Create OAuth2 client
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Gmail not configured');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch emails (last 50)
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
    });

    const messages = messagesResponse.data.messages || [];
    let syncedCount = 0;

    // Process each email
    for (const message of messages) {
      if (!message.id) continue;

      try {
        // Get full message
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full',
        });

        const headers = fullMessage.data.payload?.headers || [];
        const from = headers.find((h) => h.name === 'From')?.value || '';
        const subject = headers.find((h) => h.name === 'Subject')?.value || '';
        const dateStr = headers.find((h) => h.name === 'Date')?.value || '';

        // Extract email address
        const fromEmail = extractEmail(from);

        // Check if email already logged
        const existing = await prisma.activity.findFirst({
          where: { externalEmailId: message.id, deletedAt: null },
        });

        if (existing) continue;

        // Find matching contact in this workspace
        const contact = await prisma.contact.findFirst({
          where: {
            email: fromEmail,
            workspaceId,
            deletedAt: null,
            OR: [{ gmailSyncEnabled: true }, { gmailSyncEnabled: null }],
          },
        });

        if (contact) {
          // Extract email body
          const body = getEmailBody(fullMessage.data.payload);

          // Create activity for this email
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
        console.error(`[cron-gmail-sync] Error processing message ${message.id}:`, error);
      }
    }

    // Update last sync time
    await prisma.user.update({
      where: { id: userId },
      data: { gmailLastSync: new Date() },
    });

    return syncedCount;
  } catch (error) {
    console.error(`[cron-gmail-sync] Error syncing user ${userId}:`, error);
    throw error;
  }
}

function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1] : emailString.trim();
}

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
