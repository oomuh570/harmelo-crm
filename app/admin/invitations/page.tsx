import InviteForm from './_components/invite-form';
import InvitationRowActions from './_components/invitation-row-actions';

type Invitation = {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  invitedBy: { id: string; fullName: string };
  status: 'accepted' | 'expired' | 'pending';
};

// TODO(backend): fetch real invitations. Returns empty list so UI renders.
async function getInvitations(): Promise<Invitation[]> {
  return [];
}

function fmtDate(d: Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function InvitationsPage() {
  const invitations = await getInvitations();

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-sm font-medium text-white">Invite a new member</h2>
        <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-4">
          <InviteForm />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white">Invitations</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-700 bg-[#0f1117]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">Email</th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">Role</th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">Sent</th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">Expires</th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">Invited by</th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-500">
                    No invitations yet.
                  </td>
                </tr>
              )}
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-800/60 last:border-0">
                  <td className="px-3 py-2 text-white">{inv.email}</td>
                  <td className="px-3 py-2 text-gray-300">{inv.role}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        'rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ' +
                        (inv.status === 'accepted'
                          ? 'bg-[#00D4B8]/20 text-[#00D4B8]'
                          : inv.status === 'expired'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-gray-700 text-gray-300')
                      }
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-400">{fmtDate(inv.createdAt)}</td>
                  <td className="px-3 py-2 text-gray-400">{fmtDate(inv.expiresAt)}</td>
                  <td className="px-3 py-2 text-gray-400">{inv.invitedBy.fullName}</td>
                  <td className="px-3 py-2 text-right">
                    <InvitationRowActions id={inv.id} status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
