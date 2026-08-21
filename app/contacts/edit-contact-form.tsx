'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import type { Contact } from './columns'
import { formatPhone } from './contact'
import RichTextEditor from '@/components/rich-text-editor'
import TagPicker from './tag-picker'

const labelClass = 'text-xs uppercase tracking-wide text-gray-400'
const inputClass =
  'rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#00D4B8] focus:ring-1 focus:ring-[#00D4B8]'

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
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // fields are prepopulated from the contact being edited
  const [form, setForm] = useState({
    name: contact.name,
    email: contact.email,
    // assume a 10-digit number and show it dashed when the form opens
    phone: formatPhone(contact.phone),
    organization: contact.organization,
    jobTitle: contact.jobTitle,
    type: contact.type,
    address: contact.address,
    notes: contact.notes,
    tagIds: contact.tags?.map((t) => t.id) ?? ([] as string[]),
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

  function getErrors() {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = 'Name is required'
    if (!form.email.trim()) errors.email = 'Email is required'
    return errors
  }

  const errors = getErrors()
  const isValid = Object.keys(errors).length === 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    try {
      // Extract tagIds from form, but don't send them to the PUT endpoint
      const { tagIds, ...contactData } = form

      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Failed to update contact')
        setPending(false)
        return
      }

      // Save tags separately if any were changed
      await fetch(`/api/contacts/${contact.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds }),
      })

      toast.success('Contact updated')
      onClose()
      setTimeout(() => router.refresh(), 500)
    } catch {
      setError('Failed to update contact')
    } finally {
      setPending(false)
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md max-h-[85vh] overflow-y-auto rounded-xl border border-gray-700 bg-[#0f1117] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-6">
          <h2 className="font-heading text-xl text-white">Edit Contact</h2>
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
            <input 
              className={inputClass + (errors.name ? ' border-red-500' : '')} 
              value={form.name} 
              onChange={update('name')} 
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Email</label>
            <input
              className={inputClass + (errors.email ? ' border-red-500' : '')}
              type="email"
              value={form.email}
              onChange={update('email')}
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Phone Number</label>
            <input
              className={inputClass}
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))
              }
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
            <label className={labelClass}>Address</label>
            <input
              className={inputClass}
              value={form.address}
              onChange={update('address')}
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
            <label className={labelClass}>Tags</label>
            <TagPicker
              selectedIds={form.tagIds}
              onChange={(ids) => setForm((f) => ({ ...f, tagIds: ids }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Notes</label>
            <RichTextEditor
              value={form.notes}
              onChange={(html) => setForm((f) => ({ ...f, notes: html }))}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

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
              disabled={pending}
              className="rounded-md bg-[#00D4B8] px-4 py-2 text-sm font-medium text-black hover:bg-[#00D4B8]/90 cursor-pointer disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  )
}
