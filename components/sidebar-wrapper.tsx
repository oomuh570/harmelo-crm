import { redirect } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { getCurrentUser } from '@/lib/ui-stubs';
import type { WorkspaceOption } from '@/components/workspace-switcher';

// TODO(backend): replace with GET /api/workspaces (partner's endpoint already exists).
// Placeholder workspaces so the switcher UI is testable end-to-end.
async function getMyWorkspaces(): Promise<WorkspaceOption[]> {
  return [
    { id: 'preview-sales', name: 'Sales' },
    { id: 'preview-ops', name: 'Ops' },
  ];
}

export default async function SidebarWrapper() {
  const [user, workspaces] = await Promise.all([
    getCurrentUser(),
    getMyWorkspaces(),
  ]);
  // Loop-safe: /no-workspace doesn't render <SidebarWrapper />, so we never redirect to
  // a page that would render us again.
  if (user && workspaces.length === 0) redirect('/no-workspace');
  return <Sidebar role={user?.role} workspaces={workspaces} />;
}
