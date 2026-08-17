'use client'

import { useState } from 'react'
import { Phone, Mail, Calendar, StickyNote } from 'lucide-react'
import ContactPopup from '@/app/contacts/contact-popup'
import type { Contact } from '@/app/contacts/contact'

type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE'

export type RecentActivity = {
  id: string
  type: ActivityType
  notes: string
  occurredAt: Date
  contact: Contact | null
}

const icons: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  NOTE: StickyNote,
}

const labels: Record<ActivityType, string> = {
  CALL: 'Call',
  EMAIL: 'Email',
  MEETING: 'Meeting',
  NOTE: 'Note',
}

function relativeTime(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function firstLine(s: string) {
  const plain = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
  const line = plain.split(/\r?\n/).find((l) => l.trim()) ?? ''
  const trimmed = line.trim()
  return trimmed.length > 80 ? trimmed.slice(0, 77) + '…' : trimmed
}

export default function RecentActivityList({
  activities,
}: {
  activities: RecentActivity[]
}) {
  const [selected, setSelected] = useState<Contact | null>(null)

  if (activities.length === 0) {
    return <p className="text-sm text-gray-500">No activity yet.</p>
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {activities.map((a) => {
          const Icon = icons[a.type]
          const clickable = a.contact !== null
          const inner = (
            <>
              <Icon className="h-4 w-4 shrink-0 text-gray-400" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      'truncate text-sm ' + (a.contact ? 'text-white' : 'text-gray-500 italic')
                    }
                  >
                    {a.contact?.name ?? '(no contact)'}
                  </span>
                  <span className="shrink-0 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
                    {labels[a.type]}
                  </span>
                </div>
                {a.notes && (
                  <div className="truncate text-xs text-gray-400">
                    {firstLine(a.notes)}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-xs text-gray-500" suppressHydrationWarning>
                {relativeTime(a.occurredAt)}
              </div>
            </>
          )
          return (
            <li key={a.id}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => setSelected(a.contact)}
                  className="flex w-full items-center gap-3 rounded-md border border-gray-800 bg-[#07090F] px-3 py-2.5 text-left hover:border-gray-600 cursor-pointer"
                >
                  {inner}
                </button>
              ) : (
                <div className="flex w-full items-center gap-3 rounded-md border border-gray-800 bg-[#07090F] px-3 py-2.5">
                  {inner}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {selected && (
        <ContactPopup contact={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
