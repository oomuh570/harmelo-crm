'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import ConfirmDialog from '@/components/confirm-dialog'
import { SAMPLE_TAGS, type Tag } from './sample-tags'

export default function TagsManager() {
  // TODO: replace SAMPLE_TAGS with a GET /api/tags fetch on mount once the endpoint exists.
  const [tags, setTags] = useState<Tag[]>(SAMPLE_TAGS)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const trimmedNew = newName.trim()
  const nameExists = (name: string, ignoreId?: string) =>
    tags.some((t) => t.name.toLowerCase() === name.toLowerCase() && t.id !== ignoreId)

  function handleAdd() {
    if (!trimmedNew || nameExists(trimmedNew)) return
    // TODO: POST /api/tags { name: trimmedNew }. On success, append the returned
    // tag (with server-generated id) to state. On failure, surface an error.
    setTags((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: trimmedNew, contactCount: 0 },
    ])
    setNewName('')
  }

  function startRename(t: Tag) {
    setEditingId(t.id)
    setEditValue(t.name)
  }

  function saveRename() {
    if (!editingId) return
    const trimmed = editValue.trim()
    if (!trimmed || nameExists(trimmed, editingId)) return
    // TODO: PATCH /api/tags/${editingId} { name: trimmed }. Replace the tag in state
    // with the response on success; surface an error and keep the editor open on failure.
    setTags((prev) =>
      prev.map((t) => (t.id === editingId ? { ...t, name: trimmed } : t)),
    )
    setEditingId(null)
    setEditValue('')
  }

  function cancelRename() {
    setEditingId(null)
    setEditValue('')
  }

  function handleDelete() {
    if (!confirmDeleteId) return
    // TODO: DELETE /api/tags/${confirmDeleteId}. Only filter state after the
    // request succeeds; surface an error on failure (e.g. tag still in use).
    setTags((prev) => prev.filter((t) => t.id !== confirmDeleteId))
    setConfirmDeleteId(null)
  }

  const deleteTarget = tags.find((t) => t.id === confirmDeleteId) ?? null
  const addDisabled = !trimmedNew || nameExists(trimmedNew)

  return (
    <div className="w-full max-w-2xl px-4">
      <p className="text-center text-sm text-gray-500 mb-6">
        Manage the tags available across your contacts.
      </p>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="New tag name…"
          className="flex-1 rounded-md border border-gray-700 bg-[#0f1117] px-3 py-2 text-sm text-white outline-none focus:border-gray-500"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={addDisabled}
          className="inline-flex items-center gap-1 rounded-md bg-[#00D4B8] px-3 py-2 text-sm font-medium text-black hover:bg-[#00D4B8]/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Add tag
        </button>
      </div>

      {tags.length === 0 ? (
        <p className="text-center text-sm text-gray-500">
          No tags yet. Add your first one above.
        </p>
      ) : (
        <ul className="rounded-md border border-gray-800 bg-[#0f1117] divide-y divide-gray-800">
          {tags.map((t) => {
            const isEditing = editingId === t.id
            const editTrimmed = editValue.trim()
            const renameDisabled =
              !editTrimmed || nameExists(editTrimmed, t.id)
            return (
              <li
                key={t.id}
                className="group flex items-center gap-3 px-4 py-3"
              >
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename()
                        if (e.key === 'Escape') cancelRename()
                      }}
                      autoFocus
                      className="flex-1 rounded-md border border-gray-700 bg-[#07090F] px-2 py-1 text-sm text-white outline-none focus:border-gray-500"
                    />
                    <button
                      type="button"
                      onClick={saveRename}
                      disabled={renameDisabled}
                      aria-label="Save"
                      title="Save"
                      className="text-[#00D4B8] hover:text-[#00D4B8]/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelRename}
                      aria-label="Cancel rename"
                      title="Cancel"
                      className="text-gray-500 hover:text-white cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate text-sm text-white">
                      {t.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {t.contactCount}{' '}
                      {t.contactCount === 1 ? 'contact' : 'contacts'}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => startRename(t)}
                        aria-label="Rename tag"
                        title="Rename"
                        className="text-gray-500 hover:text-[#00D4B8] cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(t.id)}
                        aria-label="Delete tag"
                        title="Delete"
                        className="text-gray-500 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={
            deleteTarget.contactCount > 0
              ? `Delete the "${deleteTarget.name}" tag? It is currently applied to ${deleteTarget.contactCount} contact${deleteTarget.contactCount === 1 ? '' : 's'}.`
              : `Delete the "${deleteTarget.name}" tag?`
          }
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}
