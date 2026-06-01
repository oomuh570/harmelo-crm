'use client'

import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmDialog({ message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#0f1117] border border-gray-700 rounded-lg p-6 w-80 flex flex-col gap-4">
        <p className="text-white text-sm">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-1.5 rounded-md text-sm text-gray-300 hover:bg-gray-700 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-1.5 rounded-md text-sm bg-red-600 hover:bg-red-700 text-white cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
