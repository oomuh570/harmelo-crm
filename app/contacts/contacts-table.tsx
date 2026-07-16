'use client'

import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { columns } from './columns'
import { mapContact, type Contact } from './contact'
import { DataTable } from './data-table'
import ContactsFilter, {
  EMPTY_FILTERS,
  type FilterState,
} from './contacts-filter'

const PAGE_SIZE = 20

const inputClass =
  'w-full rounded-md border border-gray-700 bg-[#07090F] pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#00D4B8] focus:ring-1 focus:ring-[#00D4B8]'

export default function ContactsTable({
  initialData,
  initialTotalPages,
}: {
  initialData: Contact[]
  initialTotalPages: number
}) {
  // immediate text in the box vs the committed (debounced) search term
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  // Frontend-only for now — backend wiring (filter params on GET /api/contacts) pending.
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)

  const [page, setPage] = useState(1)
  const [data, setData] = useState(initialData)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)
  // bumped to force a refetch of the current page/search after a mutation
  const [reloadKey, setReloadKey] = useState(0)

  // the first render already has server-provided data — don't refetch it
  const isFirst = useRef(true)
  // skip the mount so the debounce doesn't reset the page before any typing
  const searchFirst = useRef(true)
  // skip the mount so the initial server data isn't treated as a change
  const dataFirst = useRef(true)

  // debounce the search box, and reset to page 1 whenever the term changes
  useEffect(() => {
    if (searchFirst.current) {
      searchFirst.current = false
      return
    }
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // when the server re-renders with fresh data (add/edit/delete + router.refresh()),
  // refetch the current page/search so the table reflects the change in place
  useEffect(() => {
    if (dataFirst.current) {
      dataFirst.current = false
      return
    }
    setReloadKey((k) => k + 1)
  }, [initialData])

  // fetch a page from the endpoint when page, search, or reloadKey changes
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }

    let cancelled = false
    setLoading(true)

    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
    if (search) params.set('search', search)
    if (filters.categories.length > 0) params.set('type', filters.categories.join(','));
    if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
    fetch(`/api/contacts?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('request failed'))))
      .then((json) => {
        if (cancelled) return
        const rows = json.contacts as Parameters<typeof mapContact>[0][]
        setData(rows.map(mapContact))
        setTotalPages(json.pagination.totalPages)
      })
      .catch(() => {
        // keep the current rows on error
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, search, filters, reloadKey])

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          className={inputClass}
          placeholder="Search by name, email, or organization…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <ContactsFilter value={filters} onChange={setFilters} />

      <DataTable columns={columns} data={data} />

      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>
          Page {page} of {totalPages}
          {loading && <span className="ml-2 text-gray-600">Loading…</span>}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="rounded-md border border-gray-700 px-3 py-1.5 text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="rounded-md border border-gray-700 px-3 py-1.5 text-gray-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
