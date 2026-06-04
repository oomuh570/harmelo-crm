'use client'

import { Phone, Mail, Calendar, StickyNote, Check } from 'lucide-react'

type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE'

export type FollowUp = {
  id: string
  type: ActivityType
  notes: string
  followUpAt: Date
  contact: { id: string; name: string }
}

const icons: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  NOTE: StickyNote,
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function dueLabel(followUpAt: Date) {
  const now = new Date()
  const today = startOfDay(now)
  const dueDay = startOfDay(followUpAt)
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000)

  if (diffDays < 0) return { text: 'Overdue', tone: 'overdue' as const }
  if (diffDays === 0) return { text: 'Today', tone: 'today' as const }
  if (diffDays === 1) return { text: 'Tomorrow', tone: 'normal' as const }
  const weekday = followUpAt.toLocaleDateString(undefined, { weekday: 'short' })
  const time = followUpAt.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: followUpAt.getMinutes() === 0 ? undefined : '2-digit',
  })
  return { text: `${weekday} ${time}`, tone: 'normal' as const }
}

function firstLine(s: string) {
  const line = s.split(/\r?\n/)[0]
  return line.length > 80 ? line.slice(0, 77) + '…' : line
}

export default function FollowUpsList({ followUps }: { followUps: FollowUp[] }) {
  if (followUps.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No follow-ups this week — you&apos;re caught up.
      </p>
    )
  }

  function handleMarkDone(id: string) {
    // TODO: wire to PATCH /api/activities/[id] with { followUpAt: null },
    // then revalidatePath('/') so the widget refreshes.
    console.log('mark done (stub):', id)
  }

  return (
    <ul className="flex flex-col gap-2">
      {followUps.map((f) => {
        const Icon = icons[f.type]
        const due = dueLabel(f.followUpAt)
        return (
          <li
            key={f.id}
            className="flex items-center gap-3 rounded-md border border-gray-800 bg-[#07090F] px-3 py-2.5"
          >
            <Icon className="h-4 w-4 shrink-0 text-gray-400" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm text-white">
                  {f.contact.name}
                </span>
                <span
                  className={
                    'shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ' +
                    (due.tone === 'overdue'
                      ? 'bg-red-500/20 text-red-300'
                      : due.tone === 'today'
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-gray-700 text-gray-300')
                  }
                >
                  {due.text}
                </span>
              </div>
              {f.notes && (
                <div className="truncate text-xs text-gray-400">
                  {firstLine(f.notes)}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleMarkDone(f.id)}
              aria-label="Mark done"
              title="Mark done"
              className="shrink-0 rounded-md border border-gray-700 p-1.5 text-gray-400 hover:border-green-400 hover:text-green-300 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
