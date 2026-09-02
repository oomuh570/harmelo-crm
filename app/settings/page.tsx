import { getCurrentUser } from '@/lib/server-data';
import { prisma } from '@/lib/prisma';
import SidebarWrapper from '@/components/sidebar-wrapper';
import SettingsClient from './_components/settings-client';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <div>Not authenticated</div>;
  }

  // Get user with their workspace
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      gmailConnected: true,
      gmailLastSync: true,
      workspaceId: true, // Direct field, not relation
    },
  });

  if (!userData?.workspaceId) {
    return <div className="p-4 text-red-400">No workspace found. Please contact support.</div>;
  }

  return (
    <div className="min-h-screen bg-[#07090F]">
      <div className="flex">
        <SidebarWrapper />
        <div className="flex-1 min-w-0 min-h-screen flex flex-col items-center pt-16 md:pt-8">
          <h1 className="font-heading text-2xl md:text-3xl text-center text-white mb-8">
            Settings
          </h1>
          <div className="w-full max-w-2xl px-4">
            <SettingsClient
              gmailConnected={userData.gmailConnected ?? false}
              gmailLastSync={userData.gmailLastSync ?? null}
              workspaceId={userData.workspaceId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
