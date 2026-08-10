import Sidebar from '@/components/sidebar';
import { getCurrentUser } from '@/lib/auth';

export default async function SidebarWrapper() {
  const user = await getCurrentUser();
  return <Sidebar role={user?.role} />;
}
