import { getTeamKpis, getMemberProfile, getMemberFollowUps, getMemberActivity, type UserRole } from '@/lib/server-data';
import { presetRange } from '@/lib/ui-stubs';
import KpiTable from '../../_components/kpi-table';
import RangePicker from '../../_components/range-picker';
import FollowUpsList, { type FollowUp } from '@/app/_dashboard/follow-ups-list';
import RecentActivityList, { type RecentActivity } from '@/app/_dashboard/recent-activity-list';
import AdminEditProfile from './_components/admin-edit-profile';
import CreateFollowupForm from './_components/create-followup-form';

type PresetKey = 'today' | 'week' | 'last30';
function resolvePreset(v: string | undefined): PresetKey {
  return v === 'today' || v === 'last30' ? v : 'week';
}

type MemberDetail = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phoneNumber: string | null;
  createdAt: Date;
};

async function getMember(id: string): Promise<MemberDetail | null> {
  const profile = await getMemberProfile(id);
  if (!profile) return null;

  return {
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    role: (profile.role === 'SUPER_ADMIN' || profile.role === 'ADMIN') ? 'ADMIN' : 'MEMBER',
    phoneNumber: profile.phoneNumber,
    createdAt: profile.createdAt,
  };
}

async function getUserFollowUps(userId: string): Promise<FollowUp[]> {
  return getMemberFollowUps(userId);
}

async function getUserRecentActivity(userId: string): Promise<RecentActivity[]> {
  const activities = await getMemberActivity(userId);
  return activities.map(a => ({
    id: a.id,
    type: a.type,
    notes: a.notes,
    occurredAt: a.occurredAt,
    contact: a.contact,
  }));
}

export default async function TeamMemberDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preset?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const preset = resolvePreset(sp.preset);
  const range = presetRange(preset);

  const user = await getMember(id);
  if (!user) {
    return <div className="text-sm text-gray-500">Member not found.</div>;
  }

  const [kpis, followUps, activity] = await Promise.all([
    getTeamKpis(range, id),
    getUserFollowUps(id),
    getUserRecentActivity(id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-400">Member</div>
              <div className="mt-1 text-xl text-white">{user.fullName}</div>
            </div>
            <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
              {user.role}
            </span>
          </div>
          <AdminEditProfile
            userId={user.id}
            initialFullName={user.fullName}
            initialEmail={user.email}
            initialPhone={user.phoneNumber ?? ''}
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-white">KPIs</h2>
          <RangePicker current={preset} />
        </div>
        <KpiTable perUser={kpis.perUser} totals={kpis.totals} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white">Create follow-up</h2>
        <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-4 mb-6">
          <CreateFollowupForm userId={id} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white">
          Open follow-ups ({followUps.length})
        </h2>
        <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-4">
          <FollowUpsList
            followUps={followUps}
            emptyMessage="No open follow-ups for this member."
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white">Recent activity</h2>
        <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-4">
          <RecentActivityList activities={activity} />
        </div>
      </section>
    </div>
  );
}
