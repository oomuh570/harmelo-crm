import { Phone, Mail, Calendar, StickyNote } from 'lucide-react';

type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';

export type AllFollowUpRow = {
  id: string;
  type: ActivityType;
  contactName: string | null;
  ownerName: string;
  workspaceName: string;
  followUpAt: Date;
};

const icons: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  NOTE: StickyNote,
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dueLabel(followUpAt: Date) {
  const today = startOfDay(new Date());
  const dueDay = startOfDay(followUpAt);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { text: 'Overdue', tone: 'overdue' as const };
  if (diffDays === 0) return { text: 'Today', tone: 'today' as const };
  if (diffDays === 1) return { text: 'Tomorrow', tone: 'normal' as const };
  return {
    text: followUpAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tone: 'normal' as const,
  };
}

export default function AllFollowUpsTable({ rows }: { rows: AllFollowUpRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No pending follow-ups across any workspace.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700 bg-[#0f1117]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-left">
            <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
              Contact
            </th>
            <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
              Type
            </th>
            <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
              Owner
            </th>
            <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
              Workspace
            </th>
            <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
              Due
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const Icon = icons[r.type];
            const due = dueLabel(r.followUpAt);
            return (
              <tr key={r.id} className="border-b border-gray-800/60 last:border-0">
                <td
                  className={
                    'px-3 py-2 ' + (r.contactName ? 'text-white' : 'text-gray-500 italic')
                  }
                >
                  {r.contactName ?? '(no contact)'}
                </td>
                <td className="px-3 py-2 text-gray-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-gray-400" />
                    {r.type.charAt(0) + r.type.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-300">{r.ownerName}</td>
                <td className="px-3 py-2 text-gray-300">{r.workspaceName}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      'rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ' +
                      (due.tone === 'overdue'
                        ? 'bg-red-500/20 text-red-300'
                        : due.tone === 'today'
                          ? 'bg-[#00D4B8]/20 text-[#00D4B8]'
                          : 'bg-gray-700 text-gray-300')
                    }
                  >
                    {due.text}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
