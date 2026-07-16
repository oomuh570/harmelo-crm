'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, X, Check } from 'lucide-react'

interface Tag {
  id: string
  name: string
  color: string
  contactCount: number
}

type TagPickerProps = {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  availableTags?: Tag[]
}

export default function TagPicker({
  selectedIds,
  onChange,
  availableTags: propTags,
}: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [availableTags, setAvailableTags] = useState<Tag[]>(propTags ?? [])
  const [loading, setLoading] = useState(!propTags)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (propTags) {
      setAvailableTags(propTags)
      setLoading(false)
      return
    }

    const fetchTags = async () => {
      try {
        const res = await fetch('/api/tags')
        if (!res.ok) throw new Error('Failed to fetch tags')
        const tags = await res.json()
        setAvailableTags(tags)
      } catch (err) {
        console.error('Failed to fetch tags:', err)
        setAvailableTags([])
      } finally {
        setLoading(false)
      }
    }

    fetchTags()
  }, [propTags])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const selectedTags = selectedIds
    .map((id) => availableTags.find((t) => t.id === id))
    .filter((t): t is Tag => t !== undefined)

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {selectedTags.length === 0 && (
          <span className="text-xs text-gray-600">No tags assigned</span>
        )}
        {selectedTags.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full border border-[#00D4B8]/40 bg-[#00D4B8]/10 px-2 py-0.5 text-xs text-[#00D4B8]"
          >
            {t.name}
            <button
              type="button"
              onClick={() => toggle(t.id)}
              aria-label={`Remove ${t.name} tag`}
              className="hover:text-white cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-md border border-gray-700 bg-[#07090F] px-2.5 py-1 text-xs text-gray-300 hover:border-gray-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" />
          {loading ? 'Loading…' : 'Add tag'}
        </button>

        {open && (
          <div className="absolute left-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-md border border-gray-700 bg-[#0f1117] shadow-lg">
            <ul className="max-h-64 overflow-y-auto py-1">
              {loading ? (
                <li className="px-3 py-1.5 text-xs text-gray-500">
                  Loading tags…
                </li>
              ) : availableTags.length === 0 ? (
                <li className="px-3 py-1.5 text-xs text-gray-500">
                  No tags available
                </li>
              ) : (
                availableTags.map((t) => {
                  const checked = selectedIds.includes(t.id)
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => toggle(t.id)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-800 cursor-pointer"
                      >
                        <span className="truncate">{t.name}</span>
                        {checked && <Check className="h-3.5 w-3.5 text-[#00D4B8]" />}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
