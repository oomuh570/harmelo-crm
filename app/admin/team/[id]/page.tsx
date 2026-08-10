import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getTeamKpis, presetRange } from '@/lib/kpis';
import KpiTable from '../../_components/kpi-table';
import RangePicker from '../../_components/range-picker';
import FollowUpsList, { type FollowUp } from '@/app/_dashboard/follow-ups-list';
import RecentActivityList, { type RecentActivity } from '@/app/_dashboard/recent-activity-list';
import { mapContact } from '@/app/contacts/contact';
import AdminEditProfile from './_components/admin-edit-profile';

type PresetKey = 'today' | 'week' | 'last30';
function resolvePreset(v: string | undefined): PresetKey {
  return v === 'today' || v === 'last30' ? v : 'week';
}

async function getUserFollowUps(userId: string): Promise<FollowUp[]> {
  const rows = await prisma.activity.findMany({
    where: {
      userId,
      deletedAt: null,
      followUpStatus: 'PENDING',
      followUpAt: { not: null },
      OR: [{ contactId: null }, { contact: { deletedAt: null } }],
    },
    orderBy: { followUpAt: 'asc' },
    take: 15,
    include: { contact: { select: { id: true, name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    notes: r.notes,
    followUpAt: r.followUpAt!,
    contact: r.contact,
  }));
}

async function getUserRecentActivity(userId: string): Promise<RecentActivity[]> {
  const rows = await prisma.activity.findMany({
    where: { userId, deletedAt: null, OR: [{ contactId: null }, { contact: { deletedAt: null } }] },
    orderBy: { occurredAt: 'desc' },
    take: 15,
    include: { contact: true },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    notes: r.notes,
    occurredAt: r.occurredAt,
    contact: r.contact ? mapContact(r.contact) : null,
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

  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, fullName: true, email: true, role: true, phoneNumber: true, createdAt: true },
  });
  if (!user) notFound();

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
