import Sidebar from '@/components/sidebar';
import { getCurrentUser } from '@/lib/ui-stubs';

export default async function SidebarWrapper() {
  const user = await getCurrentUser();
  return <Sidebar role={user?.role} />;
}
