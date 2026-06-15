'use client'

export type FollowUpMode = 'none' | 'tomorrow' | 'three_days' | 'next_week' | 'custom'

export function computePreset(mode: Exclude<FollowUpMode, 'none' | 'custom'>): Date {
  const d = new Date()
  d.setHours(9, 0, 0, 0)
  if (mode === 'tomorrow') d.setDate(d.getDate() + 1)
  else if (mode === 'three_days') d.setDate(d.getDate() + 3)
  else if (mode === 'next_week') {
    // Next Monday
    const day = d.getDay() // 0=Sun..6=Sat
    const daysUntilMonday = ((1 - day + 7) % 7) || 7
    d.setDate(d.getDate() + daysUntilMonday)
  }
  return d
}

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatFollowUpPreview(d: Date): string {
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: d.getMinutes() === 0 ? undefined : '2-digit',
  })
}

type FollowUpPickerProps = {
  mode: FollowUpMode
  followUpAt: Date | null
  customInput: string
  disabled?: boolean
  onPresetSelect: (mode: Exclude<FollowUpMode, 'none' | 'custom'>) => void
  onCustomSelect: () => void
  onCustomInputChange: (value: string) => void
}

const presets = [
  { mode: 'tomorrow', label: 'Tomorrow' },
  { mode: 'three_days', label: '3 days' },
  { mode: 'next_week', label: 'Next week' },
] as const

export default function FollowUpPicker({
  mode,
  followUpAt,
  customInput,
  disabled,
  onPresetSelect,
  onCustomSelect,
  onCustomInputChange,
}: FollowUpPickerProps) {
  return (
    <div className="mt-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
        Follow up <span className="normal-case text-gray-600">(optional)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const selected = mode === p.mode
          return (
            <button
              key={p.mode}
              type="button"
              onClick={() => onPresetSelect(p.mode)}
              disabled={disabled}
              className={`rounded-md border px-2.5 py-1 text-xs cursor-pointer transition-colors disabled:opacity-50 ${
                selected
                  ? 'border-[#00D4B8] bg-[#00D4B8]/10 text-[#00D4B8]'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
              }`}
            >
              {p.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={onCustomSelect}
          disabled={disabled}
          className={`rounded-md border px-2.5 py-1 text-xs cursor-pointer transition-colors disabled:opacity-50 ${
            mode === 'custom'
              ? 'border-[#00D4B8] bg-[#00D4B8]/10 text-[#00D4B8]'
              : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
          }`}
        >
          Custom…
        </button>
      </div>
      {mode === 'custom' && (
        <input
          type="datetime-local"
          value={customInput}
          onChange={(e) => onCustomInputChange(e.target.value)}
          disabled={disabled}
          className="mt-2 rounded-md border border-gray-700 bg-[#0f1117] px-2 py-1 text-xs text-white outline-none focus:border-gray-500 disabled:opacity-50"
        />
      )}
      {followUpAt && (
        <p className="mt-2 text-xs text-gray-500">
          Reminder set for {formatFollowUpPreview(followUpAt)}
        </p>
      )}
    </div>
  )
}
