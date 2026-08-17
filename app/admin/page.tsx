import { getTeamKpis, getTeamPendingFollowUps } from '@/lib/server-data';
import { presetRange } from '@/lib/ui-stubs';
import KpiTable from './_components/kpi-table';
import RangePicker from './_components/range-picker';
import FollowUpsList, { type FollowUp } from '@/app/_dashboard/follow-ups-list';

type PresetKey = 'today' | 'week' | 'last30';

function resolvePreset(v: string | undefined): PresetKey {
  return v === 'today' || v === 'last30' ? v : 'week';
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
    getTeamPendingFollowUps(range),
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
