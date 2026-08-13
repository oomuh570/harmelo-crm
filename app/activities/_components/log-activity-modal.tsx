'use client';
import { stubFetch as fetch } from '@/lib/ui-stubs';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type ContactOption = { id: string; name: string };
type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';

const TYPES: Array<{ value: ActivityType; label: string }> = [
  { value: 'CALL', label: 'Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'NOTE', label: 'Note' },
];

function toLocalDatetimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LogActivityModal({
  contacts,
}: {
  contacts: ContactOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActivityType>('CALL');
  const [notes, setNotes] = useState('');
  const [occurredAt, setOccurredAt] = useState(toLocalDatetimeInput(new Date()));
  const [followUpAt, setFollowUpAt] = useState('');
  const [contactId, setContactId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setType('CALL');
    setNotes('');
    setOccurredAt(toLocalDatetimeInput(new Date()));
    setFollowUpAt('');
    setContactId('');
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          notes,
          occurredAt: new Date(occurredAt).toISOString(),
          followUpAt: followUpAt ? new Date(followUpAt).toISOString() : null,
          contactId: contactId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Failed (${res.status})`);
      } else {
        close();
        router.refresh();
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-[#00D4B8] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#00D4B8]/90 cursor-pointer"
      >
        Log activity
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-gray-700 bg-[#0f1117] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium text-white mb-4">Log activity</h3>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ActivityType)}
                  className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white cursor-pointer"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                  Contact (optional)
                </label>
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white cursor-pointer"
                >
                  <option value="">(no contact)</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                  Notes {type === 'NOTE' && <span className="text-red-400">*</span>}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required={type === 'NOTE'}
                  rows={4}
                  className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                    Occurred at
                  </label>
                  <input
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    required
                    className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                    Follow-up (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                    className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-[#00D4B8] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#00D4B8]/90 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving…' : 'Log activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
