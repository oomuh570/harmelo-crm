import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { decrypt, decryptToken } from '@/lib/session';

/**
 * Sync emails from Gmail and create Activity records
 * POST /api/gmail/sync
 */
export async function POST(request: Request) {
  try {
    // Get user session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get user and check if Gmail is connected
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { gmailRefreshToken: true, gmailLastSync: true },
    });

    if (!user?.gmailRefreshToken) {
      return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 });
    }

    // Decrypt refresh token
    const refreshToken = decryptToken(user.gmailRefreshToken);
    if (!refreshToken) {
      return NextResponse.json({ error: 'Failed to decrypt refresh token' }, { status: 500 });
    }

    // Create OAuth2 client
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json({ error: 'Gmail not configured' }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Set refresh token
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch emails (last 50 emails)
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

        // Find matching contact
        const contact = await prisma.contact.findFirst({
          where: {
            email: fromEmail,
            deletedAt: null,
          },
        });

        if (contact) {
          // Create activity for this email
          await prisma.activity.create({
            data: {
              contactId: contact.id,
              userId: session.userId,
              type: 'EMAIL',
              notes: `Email: "${subject}"`,
              occurredAt: new Date(dateStr || Date.now()),
              externalEmailId: message.id,
              isAutoLogged: true,
            },
          });

          syncedCount++;
        }
      } catch (error) {
        console.error(`Failed to process message ${message.id}:`, error);
      }
    }

    // Update last sync time
    await prisma.user.update({
      where: { id: session.userId },
      data: { gmailLastSync: new Date() },
    });

    return NextResponse.json({
      success: true,
      syncedCount,
      totalMessages: messages.length,
    });
  } catch (error) {
    console.error('Gmail sync error:', error);
    return NextResponse.json({ error: 'Failed to sync emails' }, { status: 500 });
  }
}

/**
 * Extract email address from "Name <email@example.com>" format
 */
function extractEmail(emailString: string): string {
  const match = emailString.match(/<([^>]+)>/);
  return match ? match[1] : emailString.trim();
}
