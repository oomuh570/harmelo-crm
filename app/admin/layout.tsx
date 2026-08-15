import { redirect } from 'next/navigation';
import SidebarWrapper from '@/components/sidebar-wrapper';
import { getCurrentUser, canManage } from '@/lib/ui-stubs';
import Link from 'next/link';

const subNav = [
  { href: '/admin', label: 'Team KPIs' },
  { href: '/admin/team', label: 'Team' },
  { href: '/admin/invitations', label: 'Invitations' },
];

// TODO(backend): role should reflect the user's role in the *active workspace*
// (via cookie), not a global role. Preview stub always returns ADMIN.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!canManage(user.role)) redirect('/');

  return (
    <div className="min-h-screen bg-[#07090F]">
      <div className="flex">
        <SidebarWrapper />
        <div className="flex-1 min-w-0 min-h-screen">
          <div className="mx-auto w-full max-w-6xl px-4 pt-16 md:pt-8 pb-12">
            <div className="flex items-center gap-4 border-b border-gray-800 pb-3 mb-6 overflow-x-auto">
              <h1 className="font-heading text-xl md:text-2xl text-white shrink-0">
                Admin
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
