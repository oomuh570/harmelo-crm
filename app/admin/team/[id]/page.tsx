import { getTeamKpis, presetRange, type UserRole } from '@/lib/ui-stubs';
import KpiTable from '../../_components/kpi-table';
import RangePicker from '../../_components/range-picker';
import FollowUpsList, { type FollowUp } from '@/app/_dashboard/follow-ups-list';
import RecentActivityList, { type RecentActivity } from '@/app/_dashboard/recent-activity-list';
import AdminEditProfile from './_components/admin-edit-profile';

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

// TODO(backend): fetch member profile by id (or return null if not found).
async function getMember(id: string): Promise<MemberDetail | null> {
  return {
    id,
    fullName: 'Preview Member',
    email: 'member@example.com',
    role: 'VIEWER',
    phoneNumber: null,
    createdAt: new Date(),
  };
}

// TODO(backend): fetch pending follow-ups for this member.
async function getUserFollowUps(_userId: string): Promise<FollowUp[]> {
  return [];
}

// TODO(backend): fetch recent activity for this member.
async function getUserRecentActivity(_userId: string): Promise<RecentActivity[]> {
  return [];
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
