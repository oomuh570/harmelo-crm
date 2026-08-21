import { redirect } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { getCurrentUser } from '@/lib/server-data';
import { prisma } from '@/lib/prisma';

async function getMyWorkspaceName(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || !user.workspaceId) return null;

  const workspace = await prisma.workspace.findUnique({
    where: { id: user.workspaceId },
    select: { name: true },
  });

  return workspace?.name || null;
}

export default async function SidebarWrapper() {
  const [user, workspaceName] = await Promise.all([
    getCurrentUser(),
    getMyWorkspaceName(),
  ]);
  // Loop-safe: /no-workspace doesn't render <SidebarWrapper />.
  // SUPER_ADMIN can access /super-admin/* to create workspaces even with no workspace assignments
  if (user && !workspaceName && user.role !== 'SUPER_ADMIN') redirect('/no-workspace');
  return <Sidebar role={user?.role} workspaceName={workspaceName} />;
}
