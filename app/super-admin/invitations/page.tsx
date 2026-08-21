import SuperInviteForm, {
  type WorkspaceOption,
} from './_components/super-invite-form';
import InvitationRowActions from '@/app/admin/invitations/_components/invitation-row-actions';
import { getAllWorkspaces as getServerWorkspaces, getAllInvitations as getServerInvitations } from '@/lib/server-data';

type SuperInvitation = {
  id: string;
  email: string;
  role: 'VIEWER' | 'EDITOR' | 'ADMIN';
  workspace: { id: string; name: string };
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  invitedBy: { id: string; fullName: string };
  status: 'accepted' | 'expired' | 'pending';
};

async function getAllWorkspaces(): Promise<WorkspaceOption[]> {
  const workspaces = await getServerWorkspaces();
  return workspaces.map(ws => ({ id: ws.id, name: ws.name }));
}

async function getAllInvitations(): Promise<SuperInvitation[]> {
  return getServerInvitations();
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

export default async function SuperAdminInvitationsPage() {
  const [workspaces, invitations] = await Promise.all([
    getAllWorkspaces(),
    getAllInvitations(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-sm font-medium text-white">Invite someone to any workspace</h2>
        <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-4">
          <SuperInviteForm workspaces={workspaces} />
          {workspaces.length === 0 && (
            <p className="mt-3 text-xs text-gray-500">
              No workspaces exist yet. Create one first (or wait for the backend to hook up).
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white">All invitations</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-700 bg-[#0f1117]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">Email</th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">Workspace</th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">Role</th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">Accepted</th>
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
                  <td colSpan={9} className="px-3 py-6 text-center text-sm text-gray-500">
                    No invitations yet.
                  </td>
                </tr>
              )}
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-800/60 last:border-0">
                  <td className="px-3 py-2 text-white">{inv.email}</td>
                  <td className="px-3 py-2 text-gray-300">{inv.workspace.name}</td>
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
                  <td className="px-3 py-2 text-gray-400">{fmtDate(inv.acceptedAt)}</td>
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
