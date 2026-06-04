'use client'

import { useState } from 'react'
import ContactPopup from '@/app/contacts/contact-popup'
import type { Contact } from '@/app/contacts/contact'

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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export default function RecentContactsList({ contacts }: { contacts: Contact[] }) {
  const [selected, setSelected] = useState<Contact | null>(null)

  if (contacts.length === 0) {
    return <p className="text-sm text-gray-500">No contacts yet.</p>
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {contacts.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setSelected(c)}
              className="flex w-full items-center gap-3 rounded-md border border-gray-800 bg-[#07090F] px-3 py-2.5 text-left hover:border-gray-600 cursor-pointer"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-700 text-xs text-white">
                {initials(c.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm text-white">{c.name}</div>
                <div className="truncate text-xs text-gray-400">
                  {c.organization || c.type}
                </div>
              </div>
              <div className="shrink-0 text-xs text-gray-500">
                {relativeTime(c.createdAt)}
              </div>
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <ContactPopup contact={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
