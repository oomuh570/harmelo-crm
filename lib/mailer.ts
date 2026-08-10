import nodemailer, { type Transporter } from 'nodemailer';

let cached: Transporter | null = null;

/**
 * Returns a Nodemailer transporter if GMAIL_USER + GMAIL_PASSWORD are set,
 * otherwise null. Callers must handle the null case (usually by logging).
 */
export function getMailer(): Transporter | null {
  if (cached) return cached;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASSWORD;
  if (!user || !pass) return null;
  cached = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return cached;
}

export function getMailerFromAddress(): string | undefined {
  return process.env.GMAIL_USER;
}
