import { prisma } from '@/lib/prisma';
import { getTeamKpis, presetRange } from '@/lib/kpis';
import KpiTable from './_components/kpi-table';
import RangePicker from './_components/range-picker';
import FollowUpsList, { type FollowUp } from '@/app/_dashboard/follow-ups-list';

type PresetKey = 'today' | 'week' | 'last30';

function resolvePreset(v: string | undefined): PresetKey {
  return v === 'today' || v === 'last30' ? v : 'week';
}

async function getTeamPendingFollowUps(): Promise<FollowUp[]> {
  const rows = await prisma.activity.findMany({
    where: {
      deletedAt: null,
      followUpStatus: 'PENDING',
      followUpAt: { not: null },
      OR: [{ contactId: null }, { contact: { deletedAt: null } }],
    },
    orderBy: { followUpAt: 'asc' },
    take: 25,
    include: {
      contact: { select: { id: true, name: true } },
      user: { select: { id: true, fullName: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    notes: r.notes,
    followUpAt: r.followUpAt!,
    contact: r.contact,
    owner: r.user,
  }));
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const sp = await searchParams;
  const preset = resolvePreset(sp.preset);
  const range = presetRange(preset);

  const [kpis, teamFollowUps] = await Promise.all([
    getTeamKpis(range),
    getTeamPendingFollowUps(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-white">Team KPIs</h2>
          <RangePicker current={preset} />
        </div>
        <KpiTable perUser={kpis.perUser} totals={kpis.totals} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white">Team follow-ups</h2>
        <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-4">
          <FollowUpsList
            followUps={teamFollowUps}
            showOwner
            emptyMessage="No pending follow-ups across the team."
          />
        </div>
      </section>
    </div>
  );
}
