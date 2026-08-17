import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import InviteSignupForm from './_components/invite-signup-form';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { id },
  });

  if (!invitation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
        <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-8 max-w-md">
          <h1 className="text-xl font-medium text-white mb-2">Invitation not found</h1>
          <p className="text-sm text-gray-400">This invitation link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  if (invitation.expiresAt < now) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
        <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-8 max-w-md">
          <h1 className="text-xl font-medium text-white mb-2">Invitation expired</h1>
          <p className="text-sm text-gray-400">This invitation has expired. Please ask for a new one.</p>
        </div>
      </div>
    );
  }

  if (invitation.acceptedAt) {
    redirect('/login');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0d1117] p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-[#0f1117] p-8">
        <h1 className="text-2xl font-medium text-white mb-2">Join the team</h1>
        <p className="text-sm text-gray-400 mb-6">You've been invited to join {invitation.role === 'MEMBER' ? 'as a member' : 'as an admin'}.</p>
        <InviteSignupForm invitationId={id} email={invitation.email} />
      </div>
    </div>
  );
}
