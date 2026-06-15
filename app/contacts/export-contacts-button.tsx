'use client'

import { Download } from 'lucide-react'

export default function ExportContactsButton() {
  function handleExport() {
    // TODO: build a CSV from the current filtered/searched view and trigger a
    // download (Blob + temporary <a download>). Columns: name, email, phone,
    // organization, jobTitle, type, address, tags (joined "VIP; Lead"), notes
    // (strip HTML to plain text — Excel/Sheets render raw tags), createdAt (ISO).
    // Scope: current filtered/searched set, not just the current page.
    alert('Export coming soon')
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-[#07090F] px-4 py-2 text-sm font-medium text-gray-200 hover:border-gray-500 cursor-pointer"
    >
      <Download className="h-4 w-4" />
      Export
    </button>
  )
}
