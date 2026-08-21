import RangePicker from '@/app/admin/_components/range-picker';
import WorkspaceKpiTable, {
  type WorkspaceKpiRow,
} from './_components/workspace-kpi-table';
import AllFollowUpsTable, {
  type AllFollowUpRow,
} from './_components/all-follow-ups-table';
import { getAllWorkspaces, getAllPendingFollowUps as getServerPendingFollowUps } from '@/lib/server-data';
import { prisma } from '@/lib/prisma';

type PresetKey = 'today' | 'week' | 'last30';
function resolvePreset(v: string | undefined): PresetKey {
  return v === 'today' || v === 'last30' ? v : 'week';
}

async function getAllWorkspaceKpis(): Promise<{
  perWorkspace: WorkspaceKpiRow[];
  totals: WorkspaceKpiRow;
}> {
  try {
    const workspaces = await getAllWorkspaces();
    const perWorkspace: WorkspaceKpiRow[] = [];
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

    for (const workspace of workspaces) {
      const activities = await prisma.activity.findMany({
        where: { contact: { workspaceId: workspace.id }, deletedAt: null },
        select: { type: true },
      });

      const followUps = await prisma.followUpTask.findMany({
        where: { workspaceId: workspace.id },
        select: { status: true, dueDate: true },
      });

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const row: WorkspaceKpiRow = {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        memberCount: workspace.memberCount,
        contactCount: workspace.contactCount,
        calls: activities.filter(a => a.type === 'CALL').length,
        emails: activities.filter(a => a.type === 'EMAIL').length,
        meetings: activities.filter(a => a.type === 'MEETING').length,
        notes: activities.filter(a => a.type === 'NOTE').length,
        followUpsPending: followUps.filter(f => f.status === 'PENDING' && f.dueDate >= today).length,
        followUpsOverdue: followUps.filter(f => f.status === 'PENDING' && f.dueDate < today).length,
        followUpsCompleted: followUps.filter(f => f.status === 'COMPLETED').length,
      };

      perWorkspace.push(row);
      totals.memberCount += row.memberCount;
      totals.contactCount += row.contactCount;
      totals.calls += row.calls;
      totals.emails += row.emails;
      totals.meetings += row.meetings;
      totals.notes += row.notes;
      totals.followUpsPending += row.followUpsPending;
      totals.followUpsOverdue += row.followUpsOverdue;
      totals.followUpsCompleted += row.followUpsCompleted;
    }

    return { perWorkspace, totals };
  } catch (error) {
    console.error('Failed to fetch workspace KPIs:', error);
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
}

async function getAllPendingFollowUps(): Promise<AllFollowUpRow[]> {
  const followUps = await getServerPendingFollowUps();
  return followUps.map(f => ({
    id: f.id,
    type: 'NOTE' as const,
    contactName: f.contact?.name ?? null,
    ownerName: f.assignedTo.fullName,
    workspaceName: f.workspace.name,
    followUpAt: f.dueDate,
  }));
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
