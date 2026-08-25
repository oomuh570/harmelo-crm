import Link from "next/link";
import SignupForm from "./SignUpForm";
import { prisma } from "@/lib/prisma";

/**
 * Signup is invite-only. The only exception is the very first user, who
 * bootstraps the system as SUPER_ADMIN (see app/api/auth/signup/route.ts).
 * Everyone after that must accept an invitation link (/invite/[id]).
 */
export default async function SignUp() {
  const userCount = await prisma.user.count();
  const isBootstrap = userCount === 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07090F] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-[#0f1117] px-8 py-10 shadow-xl">
        {isBootstrap ? (
          <>
            <h1 className="font-heading text-center text-2xl text-white">Set up Harmelo</h1>
            <p className="mt-1 text-center text-sm text-gray-400">
              You&apos;re the first user — this account becomes the super admin.
            </p>
            <SignupForm />
          </>
        ) : (
          <>
            <h1 className="font-heading text-center text-2xl text-white">Signup is invite-only</h1>
            <p className="mt-3 text-center text-sm text-gray-400">
              Ask an admin to send you an invitation. If you&apos;ve already received one,
              open the link they sent to finish setting up your account.
            </p>
          </>
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
