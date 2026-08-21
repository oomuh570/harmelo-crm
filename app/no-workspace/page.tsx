import Link from 'next/link';
import { redirect } from 'next/navigation';
import { logout } from '@/auth/login-action';
import { getCurrentUser } from '@/lib/server-data';

// TODO(perms): the "Create workspace" CTA should only show for super admins.
// TODO(backend): when real workspaces exist, redirect back to `/` if the user has any.

export default async function NoWorkspacePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07090F] px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-[#0f1117] p-8 text-center">
        <h1 className="font-heading text-2xl text-white">You&apos;re not in any workspaces yet</h1>
        <p className="mt-2 text-sm text-gray-400">
          Ask a super admin to add you to a workspace, or create one if you have permission.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/super-admin/workspaces"
            className="w-full rounded-md bg-[#00D4B8] px-4 py-2 text-sm font-medium text-black hover:bg-[#00D4B8]/90"
          >
            Create a workspace
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              Log out
            </button>
          </form>
        </div>
        <p className="mt-6 text-xs text-gray-500">Signed in as {currentUser.email}</p>
      </div>
    </div>
  );
}
