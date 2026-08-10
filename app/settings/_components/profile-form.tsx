'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  initialFullName: string;
  initialPhone: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
};

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length > 6) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return digits;
}

export default function ProfileForm({ initialFullName, initialPhone, email, role }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phoneNumber: phone || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fieldError = data.fieldErrors
          ? Object.values(data.fieldErrors).flat().join(', ')
          : data.error;
        setMessage({ kind: 'error', text: fieldError ?? `Failed (${res.status})` });
      } else {
        setMessage({ kind: 'success', text: 'Saved.' });
        router.refresh();
      }
    } catch {
      setMessage({ kind: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
          Full name
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
          Phone number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="403-330-2322"
          maxLength={12}
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          readOnly
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white opacity-70 cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500">
          Only an admin can change your email. Ask them to update it from the Admin → Team page.
        </p>
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Role</label>
        <input
          type="text"
          value={role}
          readOnly
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white opacity-70 cursor-not-allowed"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-[#00D4B8] px-4 py-2 text-sm font-medium text-black hover:bg-[#00D4B8]/90 disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {message && (
          <span
            className={
              'text-sm ' + (message.kind === 'success' ? 'text-[#00D4B8]' : 'text-red-400')
            }
          >
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
