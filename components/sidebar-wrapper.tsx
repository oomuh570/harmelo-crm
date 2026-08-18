import { redirect } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { getCurrentUser } from '@/lib/ui-stubs';

// TODO(backend): look up the current user's workspace from the DB and pass its name.
// Each user belongs to exactly one workspace (User.workspaceId). Return null if none.
async function getMyWorkspaceName(): Promise<string | null> {
  return 'Preview Workspace';
}

export default async function SidebarWrapper() {
  const [user, workspaceName] = await Promise.all([
    getCurrentUser(),
    getMyWorkspaceName(),
  ]);
  // Loop-safe: /no-workspace doesn't render <SidebarWrapper />.
  if (user && !workspaceName) redirect('/no-workspace');
  return <Sidebar role={user?.role} workspaceName={workspaceName} />;
}
