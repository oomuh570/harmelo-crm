import Link from 'next/link';
import type { KpiRow } from '@/lib/ui-stubs';

const COLS: Array<{ key: keyof KpiRow; label: string }> = [
  { key: 'calls', label: 'Calls' },
  { key: 'emails', label: 'Emails' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'notes', label: 'Notes' },
  { key: 'followUpsPending', label: 'Upcoming' },
  { key: 'followUpsOverdue', label: 'Overdue' },
  { key: 'followUpsCompleted', label: 'Cleared' },
  { key: 'contactsTouched', label: 'Contacts' },
];

export default function KpiTable({
  perUser,
  totals,
}: {
  perUser: KpiRow[];
  totals: KpiRow;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700 bg-[#0f1117]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-left">
            <th className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400">
              User
            </th>
            {COLS.map((c) => (
              <th
                key={c.key as string}
                className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400 text-right"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {perUser.map((row) => (
            <tr key={row.userId ?? 'total'} className="border-b border-gray-800/60 last:border-0">
              <td className="px-3 py-2 text-white">
                {row.userId ? (
                  <Link
                    href={`/admin/team/${row.userId}`}
                    className="hover:text-[#00D4B8]"
                  >
                    {row.fullName}
                  </Link>
                ) : (
                  row.fullName
                )}
              </td>
              {COLS.map((c) => {
                const value = row[c.key] as number;
                const isOverdue = c.key === 'followUpsOverdue' && value > 0;
                return (
                  <td
                    key={c.key as string}
                    className={
                      'px-3 py-2 text-right tabular-nums ' +
                      (isOverdue ? 'text-red-300' : 'text-gray-200')
                    }
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="bg-[#07090F]">
            <td className="px-3 py-2 text-white font-medium">{totals.fullName}</td>
            {COLS.map((c) => {
              const value = totals[c.key] as number;
              return (
                <td
                  key={c.key as string}
                  className="px-3 py-2 text-right tabular-nums text-white font-medium"
                >
                  {value}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
