import RangePicker from '@/app/admin/_components/range-picker';
import WorkspaceKpiTable, {
  type WorkspaceKpiRow,
} from './_components/workspace-kpi-table';
import AllFollowUpsTable, {
  type AllFollowUpRow,
} from './_components/all-follow-ups-table';

type PresetKey = 'today' | 'week' | 'last30';
function resolvePreset(v: string | undefined): PresetKey {
  return v === 'today' || v === 'last30' ? v : 'week';
}

// TODO(backend): aggregate KPIs across every workspace + roll up totals.
async function getAllWorkspaceKpis(): Promise<{
  perWorkspace: WorkspaceKpiRow[];
  totals: WorkspaceKpiRow;
}> {
  const totals: WorkspaceKpiRow = {
    workspaceId: null,
    workspaceName: 'All workspaces',
    memberCount: 0,
    contactCount: 0,
    calls: 0,
    emails: 0,
    meetings: 0,
    notes: 0,
    followUpsPending: 0,
    followUpsOverdue: 0,
    followUpsCompleted: 0,
  };
  return { perWorkspace: [], totals };
}

// TODO(backend): fetch every pending follow-up across every workspace.
async function getAllPendingFollowUps(): Promise<AllFollowUpRow[]> {
  return [];
}

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const sp = await searchParams;
  const preset = resolvePreset(sp.preset);

  const [kpis, followUps] = await Promise.all([
    getAllWorkspaceKpis(),
    getAllPendingFollowUps(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <p className="text-xs text-gray-500 -mt-2">
        Cross-workspace view. Every team&apos;s stats and open work in one place.
      </p>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-white">KPIs by workspace</h2>
          <RangePicker current={preset} />
        </div>
        <WorkspaceKpiTable perWorkspace={kpis.perWorkspace} totals={kpis.totals} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white">
          All pending follow-ups
        </h2>
        <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-4">
          <AllFollowUpsTable rows={followUps} />
        </div>
      </section>
    </div>
  );
}
