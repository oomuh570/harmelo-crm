import SignupForm from "./SignUpForm";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Invitation = {
  token: string;
  email: string;
};

async function loadInvitation(token: string | undefined): Promise<
  { ok: true; invitation: Invitation } | { ok: false; reason: string }
> {
  if (!token) return { ok: false, reason: 'no-token' };
  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
    select: { token: true, email: true, acceptedAt: true, expiresAt: true },
  });
  if (!invitation) return { ok: false, reason: 'invalid' };
  if (invitation.acceptedAt) return { ok: false, reason: 'already-used' };
  if (invitation.expiresAt < new Date()) return { ok: false, reason: 'expired' };
  return { ok: true, invitation: { token: invitation.token, email: invitation.email } };
}

const REASON_COPY: Record<string, string> = {
  'no-token': 'Signing up requires an invitation. Ask your admin to send you an invite link.',
  'invalid': 'This invitation link is invalid. Ask your admin to send a fresh one.',
  'expired': 'This invitation link has expired. Ask your admin to resend it.',
  'already-used': 'This invitation has already been used. Log in with your existing account.',
};

export default async function SignUp({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = await loadInvitation(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07090F] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-[#0f1117] px-8 py-10 shadow-xl">
        <h1 className="font-heading text-center text-2xl text-white">Sign Up</h1>
        <p className="mt-1 text-center text-sm text-gray-400">Create your Harmelo account</p>

        {result.ok ? (
          <SignupForm invitationToken={result.invitation.token} invitationEmail={result.invitation.email} />
        ) : (
          <div className="mt-6 rounded-md border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
            {REASON_COPY[result.reason] ?? 'This invitation link cannot be used.'}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-1 text-sm">
          <p className="text-gray-400">Already have an account?</p>
          <Link
            className="text-[#00D4B8] hover:text-[#00D4B8]/80 cursor-pointer"
            href="/login"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
