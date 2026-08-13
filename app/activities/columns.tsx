'use client'

import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Mail, Phone, StickyNote, Users } from 'lucide-react'
import ContactPopup from '@/app/contacts/contact-popup'
import type { Contact } from '@/app/contacts/contact'

export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE'

export type ActivityRow = {
  id: string
  type: ActivityType
  notes: string
  occurredAt: string
  followUpAt: string | null
  user: { id: string; fullName: string; email: string } | null
  contact: { id: string; name: string } | null
}

const typeIcons: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Users,
  NOTE: StickyNote,
}

function typeLabel(t: ActivityType) {
  return t.charAt(0) + t.slice(1).toLowerCase()
}

function formatDate(value: string) {
  const d = new Date(value)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function truncate(s: string, max = 80) {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…'
}

// Minimal Contact for ContactPopup's initial render; the popup itself refetches
// the full contact from GET /api/contacts/[id] on mount.
function minimalContact(c: { id: string; name: string }): Contact {
  return {
    id: c.id,
    name: c.name,
    phone: '',
    email: '',
    organization: '',
    jobTitle: '',
    type: '',
    address: '',
    notes: '',
    createdAt: new Date(),
  }
}

function ContactNameCell({ contact }: { contact: { id: string; name: string } }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-[#00D4B8] hover:underline cursor-pointer"
      >
        {contact.name}
      </button>
      {open && (
        <ContactPopup
          contact={minimalContact(contact)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export const columns: ColumnDef<ActivityRow>[] = [
  {
    accessorKey: 'occurredAt',
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="flex items-center gap-1 hover:text-gray-300 cursor-pointer"
      >
        Date
        <ArrowUpDown className="h-3.5 w-3.5" />
      </button>
    ),
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm text-gray-200">
        {formatDate(row.original.occurredAt)}
      </span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const Icon = typeIcons[row.original.type]
      return (
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-200">
          <Icon className="h-3.5 w-3.5 text-gray-400" />
          {typeLabel(row.original.type)}
        </span>
      )
    },
  },
  {
    id: 'contact',
    header: 'Contact',
    cell: ({ row }) =>
      row.original.contact ? (
        <ContactNameCell contact={row.original.contact} />
      ) : (
        <span className="text-gray-600">—</span>
      ),
  },
  {
    id: 'notes',
    header: 'Notes',
    cell: ({ row }) => {
      const text = truncate(stripHtml(row.original.notes))
      return (
        <span className="block max-w-[28rem] truncate text-sm text-gray-300">
          {text || <span className="text-gray-600">—</span>}
        </span>
      )
    },
  },
  {
    accessorKey: 'followUpAt',
    header: 'Follow-up',
    meta: { className: 'hidden md:table-cell' },
    cell: ({ row }) => {
      const v = row.original.followUpAt
      if (!v) return <span className="text-gray-600">—</span>
      return (
        <span className="whitespace-nowrap text-sm text-[#00D4B8]">
          {formatDate(v)}
        </span>
      )
    },
  },
  {
    id: 'user',
    header: 'User',
    meta: { className: 'hidden md:table-cell' },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm text-gray-300">
        {row.original.user?.fullName ?? <span className="text-gray-600">—</span>}
      </span>
    ),
  },
]
