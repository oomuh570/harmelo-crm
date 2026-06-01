'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Mail, Phone, Building2, Briefcase, StickyNote, Calendar, X } from 'lucide-react'
import type { Contact } from './columns'

function formatType(type: string) {
  if (type === 'US') return 'US'
  return type.charAt(0) + type.slice(1).toLowerCase()
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-500">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className={`text-sm break-words ${value ? 'text-gray-100' : 'text-gray-600'}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  )
}

export default function ContactPopup({
  contact,
  onClose,
}: {
  contact: Contact
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md bg-[#0f1117] border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-gray-800">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-400/20 text-green-300 font-semibold">
            {initials(contact.name) || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white truncate">{contact.name}</h2>
            <span className="mt-1 inline-block rounded-full bg-gray-700/60 px-2.5 py-0.5 text-xs text-gray-300">
              {formatType(contact.type)}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-6">
          <Field icon={<Mail className="h-4 w-4" />} label="Email" value={contact.email} />
          <Field icon={<Phone className="h-4 w-4" />} label="Phone" value={contact.phoneNumber} />
          <Field
            icon={<Building2 className="h-4 w-4" />}
            label="Organization"
            value={contact.organization}
          />
          <Field
            icon={<Briefcase className="h-4 w-4" />}
            label="Job Title"
            value={contact.jobTitle}
          />
          <div className="sm:col-span-2">
            <Field
              icon={<StickyNote className="h-4 w-4" />}
              label="Notes"
              value={contact.notes}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-800 text-xs text-gray-500">
          <Calendar className="h-3.5 w-3.5" />
          Added {formatDate(contact.createdAt)}
        </div>
      </div>
    </>,
    document.body
  )
}
