'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  MapPin,
  StickyNote,
  Calendar,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import type { Contact } from './columns'
import { mapContact } from './contact'
import RichTextDisplay from '@/components/rich-text-display'
import RichTextEditor from '@/components/rich-text-editor'
import ConfirmDialog from '@/components/confirm-dialog'

type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE'

type Activity = {
  id: string
  type: ActivityType
  notes: string
  occurredAt: string
  user: { id: string; fullName: string; email: string } | null
}

function formatType(type: string) {
  if (type === 'US') return 'US'
  return type.charAt(0) + type.slice(1).toLowerCase()
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatShortDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const activityIcons: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Users,
  NOTE: StickyNote,
}

function activityLabel(type: ActivityType) {
  return type.charAt(0) + type.slice(1).toLowerCase()
}

const activityPlaceholders: Record<ActivityType, string> = {
  CALL: 'What did you discuss?',
  EMAIL: 'What was sent or received?',
  MEETING: 'What came out of the meeting?',
  NOTE: 'Anything worth remembering…',
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-gray-500">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className={`text-sm break-words ${value ? 'text-gray-100' : 'text-gray-600'}`}>
          {value || '—'}
        </p>
      </div>
    </div>
  )
}

type ActivityTimelineProps = {
  activities: Activity[]
  onDeleteRequest: (id: string) => void
  editingId: string | null
  editType: ActivityType
  editNotes: string
  editError: string | null
  editSubmitting: boolean
  onEditStart: (a: Activity) => void
  onEditCancel: () => void
  onEditSave: () => void
  onEditTypeChange: (t: ActivityType) => void
  onEditNotesChange: (html: string) => void
}

function ActivityTimeline({
  activities,
  onDeleteRequest,
  editingId,
  editType,
  editNotes,
  editError,
  editSubmitting,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditTypeChange,
  onEditNotesChange,
}: ActivityTimelineProps) {
  return (
    <ol className="relative">
      <span
        aria-hidden
        className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-800"
      />
      {activities.map((a) => {
        const Icon = activityIcons[a.type]
        const isEditing = editingId === a.id
        return (
          <li key={a.id} className="group relative flex gap-3 pb-4 last:pb-0">
            <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0f1117] ring-1 ring-gray-700 text-gray-300">
              <Icon className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-gray-500">
                  <span className="text-gray-300">{activityLabel(a.type)}</span>
                  {' · '}
                  {formatShortDate(a.occurredAt)}
                  {a.user && <> · {a.user.fullName}</>}
                </p>
                {!isEditing && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onEditStart(a)}
                      aria-label="Edit activity"
                      title="Edit activity"
                      className="text-gray-500 hover:text-green-300 transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRequest(a.id)}
                      aria-label="Delete activity"
                      title="Delete activity"
                      className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="mt-2 rounded-md border border-gray-800 bg-[#07090F] p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Type</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(['CALL', 'EMAIL', 'MEETING', 'NOTE'] as ActivityType[]).map((t) => {
                      const TypeIcon = activityIcons[t]
                      const selected = editType === t
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => onEditTypeChange(t)}
                          className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs cursor-pointer transition-colors ${
                            selected
                              ? 'border-green-400 bg-green-400/10 text-green-200'
                              : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                          }`}
                        >
                          <TypeIcon className="h-4 w-4" />
                          {activityLabel(t)}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Notes</p>
                    <RichTextEditor
                      value={editNotes}
                      onChange={onEditNotesChange}
                      placeholder={activityPlaceholders[editType]}
                      disabled={editSubmitting}
                    />
                  </div>

                  {editError && (
                    <p className="mt-2 text-xs text-red-400">{editError}</p>
                  )}

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onEditCancel}
                      disabled={editSubmitting}
                      className="rounded-md px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={onEditSave}
                      disabled={editSubmitting || !editNotes.trim()}
                      className="rounded-md bg-green-400 px-3 py-1.5 text-xs font-medium text-black hover:bg-green-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editSubmitting ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-0.5">
                  <RichTextDisplay html={a.notes} />
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default function ContactPopup({
  contact,
  onClose,
}: {
  contact: Contact
  onClose: () => void
}) {
  // start from the row data (instant render), then refresh from the server
  const [data, setData] = useState<Contact>(contact)
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [logType, setLogType] = useState<ActivityType>('NOTE')
  const [logNotes, setLogNotes] = useState('')
  const [logSubmitting, setLogSubmitting] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingActivity, setDeletingActivity] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editType, setEditType] = useState<ActivityType>('NOTE')
  const [editNotes, setEditNotes] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  function startEditActivity(a: Activity) {
    setEditingId(a.id)
    setEditType(a.type)
    setEditNotes(a.notes)
    setEditError(null)
  }

  function cancelEditActivity() {
    setEditingId(null)
    setEditNotes('')
    setEditType('NOTE')
    setEditError(null)
  }

  async function handleEditSave() {
    // TODO: wire to PUT /api/activities/[id] once that endpoint exists.
    // Shape: PUT /api/activities/${editingId} with { type: editType, notes: editNotes.trim() }.
    // On success: setActivities(prev => prev.map(a => a.id === updated.id ? updated : a))
    // On failure: setEditError(...) and keep the form open.
    if (!editingId || !editNotes.trim()) return
    cancelEditActivity()
  }

  function resetLogForm() {
    setLogOpen(false)
    setLogNotes('')
    setLogType('NOTE')
    setLogError(null)
  }

  async function handleDeleteActivity() {
    if (!confirmDeleteId || deletingActivity) return
    setDeletingActivity(true)

    try {
      const res = await fetch(`/api/activities/${confirmDeleteId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setActivities((prev) => prev.filter((a) => a.id !== confirmDeleteId))
        setConfirmDeleteId(null)
      } else {
        const body = await res.json().catch(() => null)
        setActivitiesError(body?.error ?? 'Failed to delete activity')
        setConfirmDeleteId(null)
      }
    } catch {
      setActivitiesError('Failed to delete activity')
      setConfirmDeleteId(null)
    } finally {
      setDeletingActivity(false)
    }
  }

  async function handleLogSave() {
    const trimmed = logNotes.trim()
    if (!trimmed || logSubmitting) return

    setLogSubmitting(true)
    setLogError(null)

    try {
      const res = await fetch(`/api/contacts/${contact.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: logType, notes: trimmed }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setLogError(body?.error ?? 'Failed to save activity')
        return
      }

      const created: Activity = await res.json()
      // prepend the new activity, cap the list at 5 to match the initial fetch
      setActivities((prev) => [created, ...prev].slice(0, 5))
      resetLogForm()
    } catch {
      setLogError('Failed to save activity')
    } finally {
      setLogSubmitting(false)
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // fetch the latest contact by id when the popup opens
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(`/api/contacts/${contact.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('request failed'))))
      .then((raw) => {
        if (!cancelled) setData(mapContact(raw))
      })
      .catch(() => {
        // keep showing the row data we already have on error
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [contact.id])

  // fetch the 5 most recent activities for this contact
  useEffect(() => {
    let cancelled = false
    setActivitiesLoading(true)
    setActivitiesError(null)

    fetch(`/api/contacts/${contact.id}/activities?limit=5`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('request failed'))))
      .then((payload) => {
        if (!cancelled) setActivities(payload.activities ?? [])
      })
      .catch(() => {
        if (!cancelled) setActivitiesError('Could not load activity')
      })
      .finally(() => {
        if (!cancelled) setActivitiesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [contact.id])

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md max-h-[85vh] overflow-y-auto bg-[#0f1117] border border-gray-700 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-gray-800">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-400/20 text-green-300 font-semibold">
            {initials(data.name) || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white truncate">{data.name}</h2>
            <span className="mt-1 inline-block rounded-full bg-gray-700/60 px-2.5 py-0.5 text-xs text-gray-300">
              {formatType(data.type)}
            </span>
            {loading && <span className="ml-2 text-xs text-gray-600">Refreshing…</span>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-6">
          <Field icon={<Mail className="h-4 w-4" />} label="Email" value={data.email} />
          <Field icon={<Phone className="h-4 w-4" />} label="Phone" value={data.phone} />
          <Field
            icon={<Building2 className="h-4 w-4" />}
            label="Organization"
            value={data.organization}
          />
          <Field
            icon={<Briefcase className="h-4 w-4" />}
            label="Job Title"
            value={data.jobTitle}
          />
          <div className="sm:col-span-2">
            <Field
              icon={<MapPin className="h-4 w-4" />}
              label="Address"
              value={data.address}
            />
          </div>
          <div className="sm:col-span-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-gray-500">
                <StickyNote className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-gray-500">Notes</p>
                <RichTextDisplay html={data.notes} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="border-t border-gray-800 p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Recent Activity
            </p>
            {!logOpen && (
              <button
                onClick={() => setLogOpen(true)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-green-300 hover:bg-green-400/10 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Log Activity
              </button>
            )}
          </div>

          {logOpen && (
            <div className="mb-4 rounded-md border border-gray-800 bg-[#07090F] p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Type</p>
              <div className="grid grid-cols-4 gap-2">
                {(['CALL', 'EMAIL', 'MEETING', 'NOTE'] as ActivityType[]).map((t) => {
                  const Icon = activityIcons[t]
                  const selected = logType === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLogType(t)}
                      className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs cursor-pointer transition-colors ${
                        selected
                          ? 'border-green-400 bg-green-400/10 text-green-200'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {activityLabel(t)}
                    </button>
                  )
                })}
              </div>
              <div className="mt-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Notes</p>
                <RichTextEditor
                  value={logNotes}
                  onChange={setLogNotes}
                  placeholder={activityPlaceholders[logType]}
                  disabled={logSubmitting}
                />
              </div>

              {logError && (
                <p className="mt-2 text-xs text-red-400">{logError}</p>
              )}

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetLogForm}
                  disabled={logSubmitting}
                  className="rounded-md px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogSave}
                  disabled={logSubmitting || !logNotes.trim()}
                  className="rounded-md bg-green-400 px-3 py-1.5 text-xs font-medium text-black hover:bg-green-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {logSubmitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {activitiesLoading ? (
            <p className="text-sm text-gray-500">Loading activity…</p>
          ) : activitiesError ? (
            <p className="text-sm text-red-400">{activitiesError}</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-gray-600">No activity yet.</p>
          ) : (
            <ActivityTimeline
              activities={activities}
              onDeleteRequest={setConfirmDeleteId}
              editingId={editingId}
              editType={editType}
              editNotes={editNotes}
              editError={editError}
              editSubmitting={editSubmitting}
              onEditStart={startEditActivity}
              onEditCancel={cancelEditActivity}
              onEditSave={handleEditSave}
              onEditTypeChange={setEditType}
              onEditNotesChange={setEditNotes}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-800 text-xs text-gray-500">
          <Calendar className="h-3.5 w-3.5" />
          Added {formatDate(data.createdAt)}
        </div>
      </div>

      {confirmDeleteId && (
        <ConfirmDialog
          message="Delete this activity? It will be removed from the timeline."
          onConfirm={handleDeleteActivity}
          onCancel={() => setConfirmDeleteId(null)}
          loading={deletingActivity}
        />
      )}
    </>,
    document.body
  )
}
