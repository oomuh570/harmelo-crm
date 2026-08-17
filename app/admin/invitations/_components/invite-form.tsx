'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ACTIVE_WORKSPACE_KEY,
  type WorkspaceOption,
} from '@/components/workspace-switcher';

type Role = 'VIEWER' | 'EDITOR' | 'ADMIN';

export default function InviteForm({
  workspaces,
}: {
  workspaces: WorkspaceOption[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // Resolve active workspace from the sidebar switcher's localStorage entry.
  useEffect(() => {
    const stored = window.localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    if (stored && workspaces.some((w) => w.id === stored)) {
      setActiveId(stored);
    } else if (workspaces.length > 0) {
      setActiveId(workspaces[0].id);
    }
  }, [workspaces]);

  const active = workspaces.find((w) => w.id === activeId) ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) {
      setError('No active workspace. Pick one from the sidebar switcher first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setInviteLink(null);
    try {
      // Hits partner's per-workspace invite endpoint.
      const res = await fetch(`/api/workspaces/${activeId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Failed (${res.status})`);
      } else {
        setEmail('');
        setInviteLink(data.inviteLink ?? null);
        router.refresh();
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-xs text-gray-400">
        Inviting to:{' '}
        {active ? (
          <span className="font-medium text-white">{active.name}</span>
        ) : (
          <span className="italic text-gray-500">no active workspace</span>
        )}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@example.com"
            className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white cursor-pointer"
          >
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting || !activeId}
          className="rounded-md bg-[#00D4B8] px-4 py-2 text-sm font-medium text-black hover:bg-[#00D4B8]/90 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Sending…' : 'Send invite'}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {inviteLink && (
        <div className="rounded-md border border-gray-700 bg-[#07090F] p-3 text-xs">
          <p className="text-gray-400 mb-1">Invite created. If email isn&apos;t configured, share this link:</p>
          <code className="break-all text-[#00D4B8]">{inviteLink}</code>
        </div>
      )}
    </form>
  );
}
