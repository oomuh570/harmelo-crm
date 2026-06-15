'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'

// Placeholder option lists for fields that don't exist on Contact yet
// (tags/region/status). Replace with real values once the schema is extended.
const CATEGORY_OPTIONS = [
  { value: 'FEDERAL', label: 'Federal' },
  { value: 'PROVINCIAL', label: 'Provincial' },
  { value: 'US', label: 'US' },
  { value: 'INVESTOR', label: 'Investor' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'OTHER', label: 'Other' },
] as const

// TODO: source from GET /api/tags so this stays in sync with the Tags Manager
// (replaces this hardcoded placeholder list).
const TAG_OPTIONS = ['VIP', 'Lead', 'Strategic', 'Inactive'] as const
const REGION_OPTIONS = ['West', 'Central', 'East', 'USA'] as const
const STATUS_OPTIONS = ['Active', 'Inactive', 'Pending'] as const

export type FilterState = {
  categories: string[]
  tags: string[]
  regions: string[]
  statuses: string[]
}

export const EMPTY_FILTERS: FilterState = {
  categories: [],
  tags: [],
  regions: [],
  statuses: [],
}

export function activeFilterCount(f: FilterState) {
  return (
    f.categories.length +
    f.tags.length +
    f.regions.length +
    f.statuses.length
  )
}

export default function ContactsFilter({
  value,
  onChange,
}: {
  value: FilterState
  onChange: (next: FilterState) => void
}) {
  const total = activeFilterCount(value)

  function toggle<K extends 'categories' | 'tags' | 'regions' | 'statuses'>(
    key: K,
    item: string,
  ) {
    const current = value[key]
    const next = current.includes(item)
      ? current.filter((v) => v !== item)
      : [...current, item]
    onChange({ ...value, [key]: next })
  }

  function clearKey(key: 'categories' | 'tags' | 'regions' | 'statuses') {
    onChange({ ...value, [key]: [] })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterDropdown
        label="Category"
        selected={value.categories}
        options={CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        onToggle={(v) => toggle('categories', v)}
        onClear={() => clearKey('categories')}
      />
      <FilterDropdown
        label="Tags"
        selected={value.tags}
        options={TAG_OPTIONS.map((v) => ({ value: v, label: v }))}
        onToggle={(v) => toggle('tags', v)}
        onClear={() => clearKey('tags')}
      />
      <FilterDropdown
        label="Region"
        selected={value.regions}
        options={REGION_OPTIONS.map((v) => ({ value: v, label: v }))}
        onToggle={(v) => toggle('regions', v)}
        onClear={() => clearKey('regions')}
      />
      <FilterDropdown
        label="Status"
        selected={value.statuses}
        options={STATUS_OPTIONS.map((v) => ({ value: v, label: v }))}
        onToggle={(v) => toggle('statuses', v)}
        onClear={() => clearKey('statuses')}
      />

      {total > 0 && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-400 hover:text-white cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
          Clear all ({total})
        </button>
      )}
    </div>
  )
}

type Option = { value: string; label: string }

function FilterDropdown({
  label,
  selected,
  options,
  onToggle,
  onClear,
}: {
  label: string
  selected: string[]
  options: Option[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
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

  const count = selected.length

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          'inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors cursor-pointer ' +
          (count > 0
            ? 'border-[#00D4B8]/60 bg-[#00D4B8]/5 text-white'
            : 'border-gray-700 bg-[#07090F] text-gray-300 hover:border-gray-500')
        }
      >
        <span>{label}</span>
        {count > 0 && (
          <span className="rounded bg-[#00D4B8]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#00D4B8]">
            {count}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-md border border-gray-700 bg-[#0f1117] shadow-lg">
          <ul className="max-h-64 overflow-y-auto py-1">
            {options.map((opt) => {
              const checked = selected.includes(opt.value)
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => onToggle(opt.value)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs text-gray-200 hover:bg-gray-800 cursor-pointer"
                  >
                    <span className="truncate">{opt.label}</span>
                    {checked && <Check className="h-3.5 w-3.5 text-[#00D4B8]" />}
                  </button>
                </li>
              )
            })}
          </ul>
          {count > 0 && (
            <div className="border-t border-gray-800">
              <button
                type="button"
                onClick={onClear}
                className="block w-full px-3 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
