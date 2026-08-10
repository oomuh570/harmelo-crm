'use client';

import { useState } from 'react';

export default function PasswordForm() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setMessage({ kind: 'error', text: 'New passwords do not match' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const issues = data.issues && data.issues.length ? data.issues.join(', ') : null;
        setMessage({ kind: 'error', text: issues ?? data.error ?? `Failed (${res.status})` });
      } else {
        setMessage({ kind: 'success', text: 'Password updated.' });
        setCurrent('');
        setNew('');
        setConfirm('');
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
          Current password
        </label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          required
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
          New password
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          required
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
        />
        <p className="mt-1 text-xs text-gray-500">
          At least 8 characters with an uppercase letter, a number, and a special character.
        </p>
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
          Confirm new password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-[#00D4B8] px-4 py-2 text-sm font-medium text-black hover:bg-[#00D4B8]/90 disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Updating…' : 'Update password'}
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
