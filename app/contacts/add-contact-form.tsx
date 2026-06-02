'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Fraunces } from 'next/font/google'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatPhone } from './contact'

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

export default function AddContactForm() {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      })

      if (res.ok) {
        setOpen(false)
        setPhone('')
        router.refresh()
        return
      }

      const data = await res.json().catch(() => null)
      setError(data?.error ?? 'Failed to save contact')
    } catch {
      setError('Failed to save contact')
    } finally {
      setPending(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="mb-2 rounded-md bg-green-400 px-4 py-2 text-sm font-medium text-black hover:bg-green-500 cursor-pointer">
        Add Contact
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-[80vh] overflow-y-auto border border-gray-700 bg-[#0f1117] text-white">
        <PopoverHeader>
          <PopoverTitle
            className={`${fraunces.className} mb-5 text-center text-xl text-white`}
          >
            Add Contact
          </PopoverTitle>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                Name <span className="text-red-400">*</span>
              </label>
              <input className={inputClass} name="name" placeholder="Jane Doe" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                Email <span className="text-red-400">*</span>
              </label>
              <input
                className={inputClass}
                name="email"
                type="email"
                placeholder="jane@example.com"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Phone Number</label>
              <input
                className={inputClass}
                name="phone"
                type="tel"
                placeholder="123-456-7890"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Organization</label>
              <input className={inputClass} name="organization" placeholder="Acme Inc." />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Job Title</label>
              <input
                className={inputClass}
                name="jobTitle"
                placeholder="Product Manager"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Type</label>
              <select className={`${inputClass} cursor-pointer`} name="type" defaultValue="OTHER">
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
                name="notes"
                rows={3}
                placeholder="Anything worth remembering…"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 rounded-md bg-green-400 py-2 text-sm font-medium text-black hover:bg-green-500 cursor-pointer disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save Contact'}
            </button>
          </form>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  )
}
