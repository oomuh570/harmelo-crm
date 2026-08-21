'use client';

import { useRouter } from 'next/navigation';
import { Phone, Mail, Calendar, StickyNote, Check } from 'lucide-react';

type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';

export type FollowUp = {
  id: string;
  type: ActivityType;
  notes: string;
  followUpAt: Date;
  contact: { id: string; name: string } | null;
  owner?: { id: string; fullName: string };
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

function dueLabel(followUpAt: Date | string) {
  const date = typeof followUpAt === 'string' ? new Date(followUpAt) : followUpAt;
  const now = new Date();
  const today = startOfDay(now);
  const dueDay = startOfDay(date);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { text: 'Overdue', tone: 'overdue' as const };
  if (diffDays === 0) return { text: 'Today', tone: 'today' as const };
  if (diffDays === 1) return { text: 'Tomorrow', tone: 'normal' as const };
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: date.getMinutes() === 0 ? undefined : '2-digit',
  });
  return { text: `${weekday} ${monthDay} ${time}`, tone: 'normal' as const };
}

function firstLine(s: string) {
  const plain = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  const line = plain.split(/\r?\n/).find((l) => l.trim()) ?? '';
  const trimmed = line.trim();
  return trimmed.length > 80 ? trimmed.slice(0, 77) + '…' : trimmed;
}

export default function FollowUpsList({
  followUps,
  showOwner = false,
  emptyMessage,
}: {
  followUps: FollowUp[];
  showOwner?: boolean;
  emptyMessage?: string;
}) {
  const router = useRouter();

  if (followUps.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        {emptyMessage ?? "No follow-ups this week — you're caught up."}
      </p>
    );
  }

  async function handleMarkDone(id: string) {
    try {
      const res = await fetch(`/api/follow-ups-new/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      if (res.ok) {
        setTimeout(() => window.location.reload(), 500);
      } else {
        console.error('Failed to mark follow-up done:', res.status);
      }
    } catch (error) {
      console.error('Error marking follow-up done:', error);
    }
  }

  return (
    <ul className="flex flex-col gap-2">
      {followUps.map((f) => {
        const Icon = icons[f.type];
        const due = dueLabel(f.followUpAt);
        return (
          <li
            key={f.id}
            className="flex items-center gap-3 rounded-md border border-gray-800 bg-[#07090F] px-3 py-2.5"
          >
            <Icon className="h-4 w-4 shrink-0 text-gray-400" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={
                    'truncate text-sm ' + (f.contact ? 'text-white' : 'text-gray-500 italic')
                  }
                >
                  {f.contact?.name ?? '(no contact)'}
                </span>
                <span
                  className={
                    'shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ' +
                    (due.tone === 'overdue'
                      ? 'bg-red-500/20 text-red-300'
                      : due.tone === 'today'
                        ? 'bg-[#00D4B8]/20 text-[#00D4B8]'
                        : 'bg-gray-700 text-gray-300')
                  }
                >
                  {due.text}
                </span>
              </div>
              {f.notes && (
                <div className="truncate text-xs text-gray-400">{firstLine(f.notes)}</div>
              )}
              {showOwner && f.owner && (
                <div className="mt-0.5 truncate text-[11px] text-gray-500">
                  Assigned to {f.owner.fullName}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleMarkDone(f.id)}
              aria-label="Mark done"
              title="Mark done"
              className="shrink-0 rounded-md border border-gray-700 p-1.5 text-gray-400 hover:border-[#00D4B8] hover:text-[#00D4B8] cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
