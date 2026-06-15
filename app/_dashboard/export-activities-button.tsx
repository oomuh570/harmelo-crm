'use client'

import { Download } from 'lucide-react'

export default function ExportActivitiesButton({
  compact = false,
}: {
  compact?: boolean
} = {}) {
  function handleExport() {
    // TODO: build a CSV from all activities the user can see and trigger a
    // download (Blob + temporary <a download>). Columns: contactName, type,
    // notes (strip HTML to plain text — Excel/Sheets render raw tags),
    // occurredAt (ISO), followUpAt (ISO or empty), userFullName.
    // Scope: every non-soft-deleted activity, oldest → newest.
    alert('Export coming soon')
  }

  const sizing = compact
    ? 'px-2 py-1 text-xs gap-1'
    : 'px-4 py-2 text-sm font-medium gap-1.5'
  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <button
      type="button"
      onClick={handleExport}
      className={`inline-flex items-center rounded-md border border-gray-700 bg-[#07090F] text-gray-200 hover:border-gray-500 cursor-pointer ${sizing}`}
    >
      <Download className={iconSize} />
      {compact ? 'Export' : 'Export activities'}
    </button>
  )
}
