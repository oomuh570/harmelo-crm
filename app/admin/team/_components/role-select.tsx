'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Partner's simplified two-role model for team management (see lib/server-data.ts).
// Invitation form uses the full VIEWER/EDITOR/ADMIN vocabulary against the schema enum.
type Role = 'ADMIN' | 'MEMBER';

export default function RoleSelect({
  userId,
  currentRole,
  isSelf = false,
}: {
  userId: string;
  currentRole: Role;
  isSelf?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Role>(currentRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: Role) {
    const previous = value;
    setValue(next);
    setSaving(true);
    setError(null);
    try {
      // TODO(backend): swap to /api/admin/team-members/[userId] (partner's real endpoint).
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Failed (${res.status})`);
        setValue(previous);
      } else {
        setTimeout(() => router.refresh(), 500);
      }
    } catch {
      setError('Network error');
      setValue(previous);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => change(e.target.value as Role)}
        disabled={saving || isSelf}
        title={isSelf ? 'Another admin has to change your role.' : undefined}
        className="rounded-md border border-gray-700 bg-[#07090F] px-2 py-1 text-xs text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="MEMBER">Member</option>
        <option value="ADMIN">Admin</option>
      </select>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
