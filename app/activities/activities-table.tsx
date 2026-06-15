'use client'

import { useEffect, useRef, useState } from 'react'
import { DataTable } from '@/app/contacts/data-table'
import { columns, type ActivityRow } from './columns'

const PAGE_SIZE = 20

export default function ActivitiesTable({
  initialData,
  initialTotalPages,
}: {
  initialData: ActivityRow[]
  initialTotalPages: number
}) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(initialData)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [loading, setLoading] = useState(false)

  // first render already has server data — skip refetch
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }

    let cancelled = false
    setLoading(true)

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    })

    fetch(`/api/activities?${params.toString()}`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error('request failed')),
      )
      .then((json) => {
        if (cancelled) return
        setData(json.activities as ActivityRow[])
        setTotalPages(json.pagination.totalPages)
      })
      .catch(() => {
        // keep current rows on error
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page])

  return (
    <div className="flex flex-col gap-3 min-w-0">
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
