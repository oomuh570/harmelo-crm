import crypto from 'crypto';

/**
 * JWT encryption & decryption for session cookies
 *
 * Sessions are stored as encrypted JWTs in httpOnly cookies.
 * This module handles encoding/decoding the session data.
 */

const algorithm = 'aes-256-cbc';

/**
 * Encrypt data with a derived key
 * Used for session tokens and sensitive data
 */
function deriveKey(secret: string): Buffer {
  return crypto.scryptSync(secret, 'salt', 32);
}

/**
 * Encrypt session data
 * Returns base64-encoded IV + ciphertext
 */
export function encrypt(data: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET not set');

  const key = deriveKey(secret);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Prepend IV to encrypted text (IV doesn't need to be secret)
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt session data
 * Expects IV + ciphertext format
 * Returns null if session doesn't exist or is invalid
 */
export function decrypt(encrypted: string | undefined): Record<string, unknown> | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET not set');

  // Handle missing or empty encrypted data - return null instead of throwing
  if (!encrypted) {
    return null;
  }

  try {
    const [ivHex, encryptedText] = encrypted.split(':');
    if (!ivHex || !encryptedText) throw new Error('Invalid encrypted format');

    const key = deriveKey(secret);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decrypt error:', error);
    return null;
  }
}

/**
 * Decrypt refresh token (for Gmail OAuth)
 * Same as decrypt but returns string instead of parsing JSON
 */
export function decryptToken(encrypted: string | undefined): string | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET not set');

  // Handle missing or empty encrypted data - return null instead of throwing
  if (!encrypted) {
    return null;
  }

  try {
    const [ivHex, encryptedText] = encrypted.split(':');
    if (!ivHex || !encryptedText) throw new Error('Invalid encrypted format');

    const key = deriveKey(secret);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decrypt token error:', error);
    return null;
  }
}

/**
 * Create a session cookie for a user
 */
export async function createSession(userId: string, email: string) {
  const { cookies } = await import('next/headers');
  const sessionData = JSON.stringify({ userId, email });
  const encryptedSession = encrypt(sessionData);

  const cookieStore = await cookies();
  cookieStore.set('session', encryptedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Delete the session cookie (logout)
 */
export async function deleteSession() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
