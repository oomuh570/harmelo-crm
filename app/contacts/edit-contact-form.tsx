'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Fraunces } from 'next/font/google'
import { X } from 'lucide-react'
import type { Contact } from './columns'

const fraunces = Fraunces({ subsets: ['latin'] })

const labelClass = 'text-xs uppercase tracking-wide text-gray-400'
const inputClass =
  'rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-green-400 focus:ring-1 focus:ring-green-400'

const CONTACT_TYPES = [
  { value: 'FEDERAL', label: 'Federal' },
  { value: 'PROVINCIAL', label: 'Provincial' },
  { value: 'US', label: 'US' },
  { value: 'INVESTOR', label: 'Investor' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'OTHER', label: 'Other' },
]

type FormFieldEvent = React.ChangeEvent<
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
>

export default function EditContactForm({
  contact,
  onClose,
}: {
  contact: Contact
  onClose: () => void
}) {
  // fields are prepopulated from the contact being edited
  const [form, setForm] = useState({
    name: contact.name,
    email: contact.email,
    phone: contact.phoneNumber,
    organization: contact.organization,
    jobTitle: contact.jobTitle,
    type: contact.type,
    notes: contact.notes,
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function update(field: keyof typeof form) {
    return (e: FormFieldEvent) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // TODO: wire up the update server action (PUT) to persist `form` for contact.id,
    // then router.refresh() the table. Frontend-only for now.
    onClose()
  }

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md max-h-[85vh] overflow-y-auto rounded-xl border border-gray-700 bg-[#0f1117] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-6">
          <h2 className={`${fraunces.className} text-xl text-white`}>Edit Contact</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form className="flex flex-col gap-4 p-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Name</label>
            <input className={inputClass} value={form.name} onChange={update('name')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Email</label>
            <input
              className={inputClass}
              type="email"
              value={form.email}
              onChange={update('email')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Phone Number</label>
            <input
              className={inputClass}
              type="tel"
              value={form.phone}
              onChange={update('phone')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Organization</label>
            <input
              className={inputClass}
              value={form.organization}
              onChange={update('organization')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Job Title</label>
            <input
              className={inputClass}
              value={form.jobTitle}
              onChange={update('jobTitle')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Type</label>
            <select
              className={`${inputClass} cursor-pointer`}
              value={form.type}
              onChange={update('type')}
            >
              {CONTACT_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-[#07090F]">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Notes</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={form.notes}
              onChange={update('notes')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-green-400 px-4 py-2 text-sm font-medium text-black hover:bg-green-500 cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  )
}
