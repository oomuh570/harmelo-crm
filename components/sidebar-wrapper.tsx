import { redirect } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { getCurrentUser, getMyWorkspaces as getServerWorkspaces } from '@/lib/server-data';
import type { WorkspaceOption } from '@/components/workspace-switcher';

async function getMyWorkspaces(): Promise<WorkspaceOption[]> {
  return getServerWorkspaces();
}

export default async function SidebarWrapper() {
  const [user, workspaces] = await Promise.all([
    getCurrentUser(),
    getMyWorkspaces(),
  ]);
  // Loop-safe: /no-workspace doesn't render <SidebarWrapper />, so we never redirect to
  // a page that would render us again.
  // SUPER_ADMIN can access /super-admin/* to create workspaces even with no workspace assignments
  if (user && workspaces.length === 0 && user.role !== 'SUPER_ADMIN') redirect('/no-workspace');
  return <Sidebar role={user?.role} workspaces={workspaces} />;
}
