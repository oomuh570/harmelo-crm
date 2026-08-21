import SidebarWrapper from '@/components/sidebar-wrapper';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/server-data';
import { redirect } from 'next/navigation';

const subNav = [
  { href: '/super-admin', label: 'Workspace KPIs' },
  { href: '/super-admin/workspaces', label: 'Workspaces' },
  { href: '/super-admin/invitations', label: 'Invitations' },
];

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') redirect('/');
  return (
    <div className="min-h-screen bg-[#07090F]">
      <div className="flex">
        <SidebarWrapper />
        <div className="flex-1 min-w-0 min-h-screen">
          <div className="mx-auto w-full max-w-6xl px-4 pt-16 md:pt-8 pb-12">
            <div className="flex items-center gap-4 border-b border-gray-800 pb-3 mb-6 overflow-x-auto">
              <h1 className="font-heading text-xl md:text-2xl text-white shrink-0">
                Super Admin
              </h1>
              <nav className="flex items-center gap-1">
                {subNav.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="rounded-md px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
