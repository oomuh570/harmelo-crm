'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteMember({
  userId,
  fullName,
}: {
  userId: string;
  fullName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (
      !confirm(
        `Remove ${fullName}? Their historical activity and follow-ups stay in the CRM, but they can no longer log in.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/team-members/${userId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? `Failed (${res.status})`);
      else router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 cursor-pointer disabled:opacity-50"
      >
        {busy ? 'Removing…' : 'Remove'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
