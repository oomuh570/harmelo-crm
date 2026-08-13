import { redirect } from 'next/navigation';
import Link from 'next/link';
import SidebarWrapper from '@/components/sidebar-wrapper';
import { getCurrentUser, type UserRole } from '@/lib/ui-stubs';

type TeamMember = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
};

// TODO(backend): fetch the real team directory.
async function getTeam(): Promise<TeamMember[]> {
  return [];
}

export default async function TeamDirectory() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const team = await getTeam();

  return (
    <div className="min-h-screen bg-[#07090F]">
      <div className="flex">
        <SidebarWrapper />
        <div className="flex-1 min-w-0 min-h-screen">
          <div className="mx-auto w-full max-w-4xl px-4 pt-16 md:pt-8 pb-12">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="font-heading text-2xl md:text-3xl text-white">Team</h1>
              {currentUser.role === 'ADMIN' && (
                <Link
                  href="/admin/team"
                  className="text-xs text-gray-400 hover:text-[#00D4B8]"
                >
                  Manage team →
                </Link>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-700 bg-[#0f1117]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-left">
                    <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                      Name
                    </th>
                    <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                      Role
                    </th>
                    <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                      Email
                    </th>
                    <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                      Phone
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((u) => (
                    <tr key={u.id} className="border-b border-gray-800/60 last:border-0">
                      <td className="px-3 py-2 text-white">
                        {u.fullName}
                        {u.id === currentUser.id && (
                          <span className="ml-2 text-xs text-gray-500">(you)</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            'rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ' +
                            (u.role === 'ADMIN'
                              ? 'bg-[#00D4B8]/20 text-[#00D4B8]'
                              : 'bg-gray-700 text-gray-300')
                          }
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        <a
                          href={`mailto:${u.email}`}
                          className="hover:text-[#00D4B8]"
                        >
                          {u.email}
                        </a>
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        {u.phoneNumber ? (
                          <a
                            href={`tel:${u.phoneNumber.replace(/\D/g, '')}`}
                            className="hover:text-[#00D4B8]"
                          >
                            {u.phoneNumber}
                          </a>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
