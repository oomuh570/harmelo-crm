import { redirect } from 'next/navigation';
import SidebarWrapper from '@/components/sidebar-wrapper';
import { getCurrentUser } from '@/lib/ui-stubs';
import ProfileForm from './_components/profile-form';
import PasswordForm from './_components/password-form';

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  // TODO(backend): fetch the full user profile (phoneNumber, etc.) from real DB.
  const user = {
    id: currentUser.id,
    fullName: currentUser.fullName,
    email: currentUser.email,
    phoneNumber: null as string | null,
    role: currentUser.role,
  };

  return (
    <div className="min-h-screen bg-[#07090F]">
      <div className="flex">
        <SidebarWrapper />
        <div className="flex-1 min-w-0 min-h-screen">
          <div className="mx-auto w-full max-w-2xl px-4 pt-16 md:pt-8 pb-12">
            <h1 className="font-heading text-2xl md:text-3xl text-white mb-6">Settings</h1>

            <section className="mb-8">
              <h2 className="mb-3 text-sm font-medium text-white">Profile</h2>
              <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-5">
                <ProfileForm
                  initialFullName={user.fullName}
                  initialPhone={user.phoneNumber ?? ''}
                  email={user.email}
                  role={user.role}
                />
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-medium text-white">Change password</h2>
              <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-5">
                <PasswordForm />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
