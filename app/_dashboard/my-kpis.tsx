import type { KpiRow } from '@/lib/kpis';

const STATS: Array<{ key: keyof KpiRow; label: string }> = [
  { key: 'calls', label: 'Calls' },
  { key: 'emails', label: 'Emails' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'notes', label: 'Notes' },
  { key: 'followUpsPending', label: 'Upcoming' },
  { key: 'followUpsOverdue', label: 'Overdue' },
  { key: 'followUpsCompleted', label: 'Cleared' },
  { key: 'contactsTouched', label: 'Contacts touched' },
];

export default function MyKpis({ row }: { row: KpiRow }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {STATS.map(({ key, label }) => {
        const value = row[key] as number;
        const isOverdue = key === 'followUpsOverdue' && value > 0;
        return (
          <div
            key={key}
            className={
              'rounded-md border bg-[#07090F] px-3 py-2 ' +
              (isOverdue ? 'border-red-500/40' : 'border-gray-800')
            }
          >
            <div className="text-[10px] uppercase tracking-wide text-gray-500">
              {label}
            </div>
            <div
              className={
                'mt-1 text-lg font-medium ' +
                (isOverdue ? 'text-red-300' : 'text-white')
              }
            >
              {value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
