import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';
import { decrypt, encrypt } from '@/lib/session';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Handle errors from Google
  if (error) {
    return NextResponse.redirect(`${baseUrl}?error=gmail_auth_failed&details=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}?error=no_code`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Gmail not configured');
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Get user session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.redirect(`${baseUrl}/login?error=not_logged_in`);
    }

    // Decrypt session to get userId (NOT async)
    const session = decrypt(sessionCookie);

    if (!session?.userId || typeof session.userId !== 'string') {
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_session`);
    }

    // Store refresh token in database (encrypted)
    const refreshToken = tokens.refresh_token;
    if (!refreshToken) {
      throw new Error('No refresh token received from Google');
    }

    const encryptedToken = encrypt(refreshToken);

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        gmailRefreshToken: encryptedToken,
        gmailConnected: true,
        gmailLastSync: new Date(),
      },
    });

    // Redirect back to settings with success message
    return NextResponse.redirect(`${baseUrl}/settings?gmail=connected`);
  } catch (error) {
    console.error('Gmail callback error:', error);
    return NextResponse.redirect(`${baseUrl}?error=gmail_callback_failed`);
  }
}
