import Link from 'next/link';
import RoleSelect from './_components/role-select';
import DeleteMember from './_components/delete-member';
import { getCurrentUser, getTeam, type UserRole } from '@/lib/server-data';

type TeamRow = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  createdAt: Date;
  lastActivityAt: Date | null;
};

function fmtDate(d: Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function TeamPage() {
  const [team, currentUser] = await Promise.all([getTeam(), getCurrentUser()]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-white">Team members</h2>
        <Link
          href="/admin/invitations"
          className="rounded-md bg-[#00D4B8] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#00D4B8]/90"
        >
          Invite member
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-700 bg-[#0f1117]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left">
              <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                Name
              </th>
              <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                Email
              </th>
              <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                Phone
              </th>
              <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                Joined
              </th>
              <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                Last activity
              </th>
              <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                Role
              </th>
              <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {team.map((u) => {
              const canRemove = u.id !== currentUser?.id;
              return (
                <tr key={u.id} className="border-b border-gray-800/60 last:border-0">
                  <td className="px-3 py-2 text-white">
                    <Link href={`/admin/team/${u.id}`} className="hover:text-[#00D4B8]">
                      {u.fullName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-gray-300">{u.email}</td>
                  <td className="px-3 py-2 text-gray-300">{u.phoneNumber ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-400">{fmtDate(u.createdAt)}</td>
                  <td className="px-3 py-2 text-gray-400">{fmtDate(u.lastActivityAt)}</td>
                  <td className="px-3 py-2">
                    <RoleSelect
                      userId={u.id}
                      currentRole={(u.role === 'SUPER_ADMIN' || u.role === 'ADMIN') ? 'ADMIN' : u.role as 'VIEWER' | 'EDITOR'}
                      isSelf={u.id === currentUser?.id}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canRemove ? (
                      <DeleteMember userId={u.id} fullName={u.fullName} />
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
