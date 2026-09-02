import CreateWorkspaceForm from './_components/create-workspace-form';
import DeleteWorkspace from './_components/delete-workspace';
import EnterWorkspace from './_components/enter-workspace';
import { getAllWorkspaces as getServerWorkspaces } from '@/lib/server-data';

type WorkspaceRow = {
  id: string;
  name: string;
  memberCount: number;
  contactCount: number;
  createdAt: Date;
};

async function getAllWorkspaces(): Promise<WorkspaceRow[]> {
  return getServerWorkspaces();
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function WorkspacesPage() {
  const workspaces = await getAllWorkspaces();

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-sm font-medium text-white">Create a new workspace</h2>
        <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-4">
          <CreateWorkspaceForm />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white">All workspaces</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-700 bg-[#0f1117]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                  Name
                </th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400 text-right">
                  Members
                </th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400 text-right">
                  Contacts
                </th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
                  Created
                </th>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {workspaces.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">
                    No workspaces yet. Create one above.
                  </td>
                </tr>
              )}
              {workspaces.map((w) => (
                <tr key={w.id} className="border-b border-gray-800/60 last:border-0">
                  <td className="px-3 py-2 text-white">{w.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-200">
                    {w.memberCount}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-200">
                    {w.contactCount}
                  </td>
                  <td className="px-3 py-2 text-gray-400">{fmtDate(w.createdAt)}</td>
                  <td className="px-3 py-2 text-right flex items-center justify-end gap-2">
                    <EnterWorkspace workspaceId={w.id} />
                    <DeleteWorkspace workspaceId={w.id} name={w.name} />
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
