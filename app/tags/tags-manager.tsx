'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import ConfirmDialog from '@/components/confirm-dialog'

interface Tag {
  id: string
  name: string
  color: string
  contactCount: number
}

export default function TagsManager() {
  const [tags, setTags] = useState<Tag[]>([])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchTags()
  }, [])

  async function fetchTags() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/tags')
      if (!res.ok) throw new Error('Failed to fetch tags')
      const data = await res.json()
      setTags(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags')
    } finally {
      setLoading(false)
    }
  }

  const trimmedNew = newName.trim()
  const nameExists = (name: string, ignoreId?: string) =>
    tags.some((t) => t.name.toLowerCase() === name.toLowerCase() && t.id !== ignoreId)

  async function handleAdd() {
    if (!trimmedNew || nameExists(trimmedNew) || isSubmitting) return
    try {
      setIsSubmitting(true)
      setError(null)
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedNew }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create tag')
      }
      const newTag: Tag = await res.json()
      setTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag')
    } finally {
      setIsSubmitting(false)
    }
  }

  function startRename(t: Tag) {
    setEditingId(t.id)
    setEditValue(t.name)
  }

  async function saveRename() {
    if (!editingId || isSubmitting) return
    const trimmed = editValue.trim()
    if (!trimmed || nameExists(trimmed, editingId)) return
    try {
      setIsSubmitting(true)
      setError(null)
      const res = await fetch(`/api/tags/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to rename tag')
      }
      const updated: Tag = await res.json()
      setTags((prev) =>
        prev.map((t) => (t.id === editingId ? updated : t)),
      )
      setEditingId(null)
      setEditValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename tag')
    } finally {
      setIsSubmitting(false)
    }
  }

  function cancelRename() {
    setEditingId(null)
    setEditValue('')
  }

  async function handleDelete() {
    if (!confirmDeleteId || isSubmitting) return
    try {
      setIsSubmitting(true)
      setError(null)
      const res = await fetch(`/api/tags/${confirmDeleteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete tag')
      }
      setTags((prev) => prev.filter((t) => t.id !== confirmDeleteId))
      setConfirmDeleteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteTarget = tags.find((t) => t.id === confirmDeleteId) ?? null
  const addDisabled = !trimmedNew || nameExists(trimmedNew)

  if (loading) {
    return (
      <div className="w-full max-w-2xl px-4 text-center">
        <p className="text-sm text-gray-500">Loading tags...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl px-4">
      <p className="text-center text-sm text-gray-500 mb-6">
        Manage the tags available across your contacts.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isSubmitting) handleAdd()
          }}
          placeholder="New tag name…"
          disabled={isSubmitting}
          className="flex-1 rounded-md border border-gray-700 bg-[#0f1117] px-3 py-2 text-sm text-white outline-none focus:border-gray-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={addDisabled || isSubmitting}
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
                        if (e.key === 'Enter' && !isSubmitting) saveRename()
                        if (e.key === 'Escape') cancelRename()
                      }}
                      autoFocus
                      disabled={isSubmitting}
                      className="flex-1 rounded-md border border-gray-700 bg-[#07090F] px-2 py-1 text-sm text-white outline-none focus:border-gray-500 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={saveRename}
                      disabled={renameDisabled || isSubmitting}
                      aria-label="Save"
                      title="Save"
                      className="text-[#00D4B8] hover:text-[#00D4B8]/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelRename}
                      disabled={isSubmitting}
                      aria-label="Cancel rename"
                      title="Cancel"
                      className="text-gray-500 hover:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={isSubmitting}
                        aria-label="Rename tag"
                        title="Rename"
                        className="text-gray-500 hover:text-[#00D4B8] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(t.id)}
                        disabled={isSubmitting}
                        aria-label="Delete tag"
                        title="Delete"
                        className="text-gray-500 hover:text-red-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
