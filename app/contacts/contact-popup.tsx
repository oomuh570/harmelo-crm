'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
  Wifi,
  WifiOff,
} from 'lucide-react'
import type { Contact } from './columns'
import { mapContact } from './contact'
import RichTextDisplay from '@/components/rich-text-display'
import RichTextEditor from '@/components/rich-text-editor'
import ConfirmDialog from '@/components/confirm-dialog'
import FollowUpPicker, {
  type FollowUpMode,
  computePreset,
  toDatetimeLocalValue,
} from './follow-up-picker'
import TagPicker from './tag-picker'

type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE'

type Activity = {
  id: string
  type: ActivityType
  notes: string
  occurredAt: string
  followUpAt: string | null
  isAutoLogged?: boolean
  user: { id: string; fullName: string; email: string } | null
}

function formatType(type: string | undefined) {
  if (!type) return 'Other'
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
  editFollowUpMode: FollowUpMode
  editFollowUpAt: Date | null
  editCustomInput: string
  onEditStart: (a: Activity) => void
  onEditCancel: () => void
  onEditSave: () => void
  onEditTypeChange: (t: ActivityType) => void
  onEditNotesChange: (html: string) => void
  onEditFollowUpPresetSelect: (mode: Exclude<FollowUpMode, 'none' | 'custom'>) => void
  onEditCustomFollowUpSelect: () => void
  onEditCustomInputChange: (value: string) => void
  userRole?: 'VIEWER' | 'EDITOR' | 'ADMIN' | 'SUPER_ADMIN'
}

function ActivityTimeline({
  activities,
  onDeleteRequest,
  editingId,
  editType,
  editNotes,
  editError,
  editSubmitting,
  editFollowUpMode,
  editFollowUpAt,
  editCustomInput,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditTypeChange,
  onEditNotesChange,
  onEditFollowUpPresetSelect,
  onEditCustomFollowUpSelect,
  onEditCustomInputChange,
  userRole,
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
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">
                    <span className="text-gray-300">{activityLabel(a.type)}</span>
                    {' · '}
                    {formatShortDate(a.occurredAt)}
                    {a.user && <> · {a.user.fullName}</>}
                  </p>
                  {a.isAutoLogged && (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[#00D4B8]/20 text-[#00D4B8]">
                      Gmail
                    </span>
                  )}
                </div>
                {!isEditing && userRole !== 'VIEWER' && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onEditStart(a)}
                      aria-label="Edit activity"
                      title="Edit activity"
                      className="text-gray-500 hover:text-[#00D4B8] transition-colors cursor-pointer"
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
                              ? 'border-[#00D4B8] bg-[#00D4B8]/10 text-[#00D4B8]'
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

                  <FollowUpPicker
                    mode={editFollowUpMode}
                    followUpAt={editFollowUpAt}
                    customInput={editCustomInput}
                    disabled={editSubmitting}
                    onPresetSelect={onEditFollowUpPresetSelect}
                    onCustomSelect={onEditCustomFollowUpSelect}
                    onCustomInputChange={onEditCustomInputChange}
                  />

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
                      disabled={editSubmitting || (editType === 'NOTE' && !editNotes.trim())}
                      className="rounded-md bg-[#00D4B8] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#00D4B8]/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
  userRole,
}: {
  contact: Contact
  onClose: () => void
  userRole?: 'VIEWER' | 'EDITOR' | 'ADMIN' | 'SUPER_ADMIN'
}) {
  const router = useRouter()
  // start from the row data (instant render), then refresh from the server
  const [data, setData] = useState<Contact>({
    ...contact,
    gmailSyncEnabled: contact.gmailSyncEnabled ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [logType, setLogType] = useState<ActivityType>('NOTE')
  const [logNotes, setLogNotes] = useState('')
  const [logSubmitting, setLogSubmitting] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)
  const [logFollowUpMode, setLogFollowUpMode] = useState<FollowUpMode>('none')
  const [logFollowUpAt, setLogFollowUpAt] = useState<Date | null>(null)
  const [logCustomInput, setLogCustomInput] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingActivity, setDeletingActivity] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editType, setEditType] = useState<ActivityType>('NOTE')
  const [editNotes, setEditNotes] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editFollowUpMode, setEditFollowUpMode] = useState<FollowUpMode>('none')
  const [editFollowUpAt, setEditFollowUpAt] = useState<Date | null>(null)
  const [editCustomInput, setEditCustomInput] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    data.tags?.map((t) => t.id) ?? []
  )
  const [savingTags, setSavingTags] = useState(false)
  const [tagError, setTagError] = useState<string | null>(null)
  const [togglingGmailSync, setTogglingGmailSync] = useState(false)

  function startEditActivity(a: Activity) {
    setEditingId(a.id)
    setEditType(a.type)
    setEditNotes(a.notes)
    setEditError(null)
    if (a.followUpAt) {
      const d = new Date(a.followUpAt)
      setEditFollowUpMode('custom')
      setEditFollowUpAt(d)
      setEditCustomInput(toDatetimeLocalValue(d))
    } else {
      setEditFollowUpMode('none')
      setEditFollowUpAt(null)
      setEditCustomInput('')
    }
  }

  function cancelEditActivity() {
    setEditingId(null)
    setEditNotes('')
    setEditType('NOTE')
    setEditError(null)
    setEditFollowUpMode('none')
    setEditFollowUpAt(null)
    setEditCustomInput('')
  }

  function selectEditFollowUpPreset(mode: Exclude<FollowUpMode, 'none' | 'custom'>) {
    if (editFollowUpMode === mode) {
      setEditFollowUpMode('none')
      setEditFollowUpAt(null)
      return
    }
    setEditFollowUpMode(mode)
    setEditFollowUpAt(computePreset(mode))
    setEditCustomInput('')
  }

  function selectEditCustomFollowUp() {
    if (editFollowUpMode === 'custom') {
      setEditFollowUpMode('none')
      setEditFollowUpAt(null)
      setEditCustomInput('')
      return
    }
    setEditFollowUpMode('custom')
    setEditFollowUpAt(null)
  }

  function onEditCustomInputChange(value: string) {
    setEditCustomInput(value)
    if (!value) {
      setEditFollowUpAt(null)
      return
    }
    const d = new Date(value)
    setEditFollowUpAt(isNaN(d.getTime()) ? null : d)
  }

  async function handleEditSave() {
    if (!editingId || editSubmitting) return
    if (editType === 'NOTE' && !editNotes.trim()) {
      setEditError('Notes are required for a note activity')
      return
    }

    setEditSubmitting(true)
    setEditError(null)

    try {
      const res = await fetch(`/api/activities/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editType,
          notes: editNotes.trim(),
          followUpAt: editFollowUpAt ? editFollowUpAt.toISOString() : null,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setEditError(body?.error ?? 'Failed to save activity')
        return
      }

      const updated: Activity = await res.json()
      setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      cancelEditActivity()
      setTimeout(() => router.refresh(), 500)
      toast.success('Activity updated')
    } catch {
      setEditError('Failed to save activity')
    } finally {
      setEditSubmitting(false)
    }
  }

  function resetLogForm() {
    setLogOpen(false)
    setLogNotes('')
    setLogType('NOTE')
    setLogError(null)
    setLogFollowUpMode('none')
    setLogFollowUpAt(null)
    setLogCustomInput('')
  }

  function selectFollowUpPreset(mode: Exclude<FollowUpMode, 'none' | 'custom'>) {
    if (logFollowUpMode === mode) {
      setLogFollowUpMode('none')
      setLogFollowUpAt(null)
      return
    }
    setLogFollowUpMode(mode)
    setLogFollowUpAt(computePreset(mode))
    setLogCustomInput('')
  }

  function selectCustomFollowUp() {
    if (logFollowUpMode === 'custom') {
      setLogFollowUpMode('none')
      setLogFollowUpAt(null)
      setLogCustomInput('')
      return
    }
    setLogFollowUpMode('custom')
    setLogFollowUpAt(null)
  }

  function onCustomInputChange(value: string) {
    setLogCustomInput(value)
    if (!value) {
      setLogFollowUpAt(null)
      return
    }
    const d = new Date(value)
    setLogFollowUpAt(isNaN(d.getTime()) ? null : d)
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
        setTimeout(() => router.refresh(), 500)
        toast.success('Activity deleted')
      } else {
        const body = await res.json().catch(() => null)
        const message = body?.error ?? 'Failed to delete activity'
        setActivitiesError(message)
        setConfirmDeleteId(null)
        toast.error(message)
      }
    } catch {
      const message = 'Failed to delete activity'
      setActivitiesError(message)
      setConfirmDeleteId(null)
      toast.error(message)
    } finally {
      setDeletingActivity(false)
    }
  }

  async function handleLogSave() {
    if (logSubmitting) return
    const trimmed = logNotes.trim()
    if (logType === 'NOTE' && !trimmed) {
      setLogError('Notes are required for a note activity')
      return
    }

    setLogSubmitting(true)
    setLogError(null)

    try {
      const res = await fetch(`/api/contacts/${contact.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: logType,
          notes: trimmed,
          followUpAt: logFollowUpAt ? logFollowUpAt.toISOString() : null,
        }),
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
      // refresh server components so the dashboard widgets pick up the new activity
      setTimeout(() => router.refresh(), 500)
      toast.success('Activity logged')
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
    setSelectedTagIds(data.tags?.map((t) => t.id) ?? [])
  }, [data.tags])

  async function handleTagsChange(tagIds: string[]) {
    try {
      setSavingTags(true)
      setTagError(null)
      const res = await fetch(`/api/contacts/${data.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to update tags')
      }

      const updated = await res.json()
      setData((prev) => ({
        ...prev,
        tags: updated.tags,
      }))
      toast.success('Tags updated')
      setTimeout(() => router.refresh(), 500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update tags'
      setTagError(message)
      toast.error(message)
    } finally {
      setSavingTags(false)
    }
  }

  async function handleToggleGmailSync() {
    setTogglingGmailSync(true)
    const newValue = !data.gmailSyncEnabled
    console.log('[Gmail Sync] Toggling from', data.gmailSyncEnabled, 'to', newValue)
    try {
      const res = await fetch(`/api/contacts/${contact.id}/gmail-sync`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gmailSyncEnabled: newValue }),
      })

      console.log('[Gmail Sync] Response status:', res.status)
      const resData = await res.json()
      console.log('[Gmail Sync] Response data:', resData)

      if (!res.ok) {
        throw new Error(resData.error || 'Failed to update Gmail sync setting')
      }

      setData((prev) => ({
        ...prev,
        gmailSyncEnabled: newValue,
      }))
      const status = newValue ? 'enabled' : 'disabled'
      toast.success(`Gmail sync ${status}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update Gmail sync'
      console.error('[Gmail Sync] Error:', message)
      toast.error(message)
    } finally {
      setTogglingGmailSync(false)
    }
  }

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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00D4B8]/20 text-[#00D4B8] font-semibold">
            {initials(data.name) || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white truncate">{data.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-700/60 px-2.5 py-0.5 text-xs text-gray-300">
                {formatType(data.type)}
              </span>
              {loading && <span className="text-xs text-gray-600">Refreshing…</span>}
            </div>
            <div className="mt-2">
              <TagPicker
                selectedIds={selectedTagIds}
                onChange={handleTagsChange}
              />
              {tagError && (
                <p className="mt-1 text-xs text-red-400">{tagError}</p>
              )}
            </div>
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
          <div className="flex items-center justify-between">
            <Field icon={<Phone className="h-4 w-4" />} label="Phone" value={data.phone} />
          </div>
          <button
            onClick={handleToggleGmailSync}
            disabled={togglingGmailSync}
            className={`sm:col-span-2 rounded-md px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer ${
              data.gmailSyncEnabled
                ? 'bg-[#00D4B8] text-black hover:bg-[#00D4B8]/90'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {data.gmailSyncEnabled ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            {data.gmailSyncEnabled ? 'Gmail Sync On' : 'Gmail Sync Off'}
          </button>
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
                {data.notes && data.notes.replace(/<[^>]*>/g, '').trim() ? (
                  <RichTextDisplay html={data.notes} />
                ) : (
                  <p className="text-sm text-gray-600">—</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="border-t border-gray-800 p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Activity
            </p>
            {!logOpen && userRole !== 'VIEWER' && (
              <button
                onClick={() => setLogOpen(true)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#00D4B8] hover:bg-[#00D4B8]/10 cursor-pointer"
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
                          ? 'border-[#00D4B8] bg-[#00D4B8]/10 text-[#00D4B8]'
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

              <FollowUpPicker
                mode={logFollowUpMode}
                followUpAt={logFollowUpAt}
                customInput={logCustomInput}
                disabled={logSubmitting}
                onPresetSelect={selectFollowUpPreset}
                onCustomSelect={selectCustomFollowUp}
                onCustomInputChange={onCustomInputChange}
              />

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
                  disabled={logSubmitting || (logType === 'NOTE' && !logNotes.trim())}
                  className="rounded-md bg-[#00D4B8] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#00D4B8]/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              editFollowUpMode={editFollowUpMode}
              editFollowUpAt={editFollowUpAt}
              editCustomInput={editCustomInput}
              onEditStart={startEditActivity}
              onEditCancel={cancelEditActivity}
              onEditSave={handleEditSave}
              onEditTypeChange={setEditType}
              onEditNotesChange={setEditNotes}
              onEditFollowUpPresetSelect={selectEditFollowUpPreset}
              onEditCustomFollowUpSelect={selectEditCustomFollowUp}
              onEditCustomInputChange={onEditCustomInputChange}
              userRole={userRole}
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
