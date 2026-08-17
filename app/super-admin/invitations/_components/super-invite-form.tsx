'use client';
import { stubFetch as fetch } from '@/lib/ui-stubs';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type WorkspaceOption = { id: string; name: string };
type Role = 'VIEWER' | 'EDITOR' | 'ADMIN';

export default function SuperInviteForm({
  workspaces,
}: {
  workspaces: WorkspaceOption[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? '');
  const [role, setRole] = useState<Role>('VIEWER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId) {
      setError('Pick a workspace');
      return;
    }
    setSubmitting(true);
    setError(null);
    setInviteLink(null);
    try {
      // TODO(backend): real endpoint. Currently stubbed via stubFetch.
      const res = await fetch('/api/super-admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, workspaceId, role }),
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:items-end">
        <div className="md:col-span-2">
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
            Workspace
          </label>
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            disabled={workspaces.length === 0}
            className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {workspaces.length === 0 && <option value="">(no workspaces)</option>}
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white cursor-pointer"
          >
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>
      <div>
        <button
          type="submit"
          disabled={submitting || workspaces.length === 0}
          className="rounded-md bg-[#00D4B8] px-4 py-2 text-sm font-medium text-black hover:bg-[#00D4B8]/90 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Sending…' : 'Send invite'}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {inviteLink && (
        <div className="rounded-md border border-gray-700 bg-[#07090F] p-3 text-xs">
          <p className="text-gray-400 mb-1">
            Invite created. If email isn&apos;t configured, share this link:
          </p>
          <code className="break-all text-[#00D4B8]">{inviteLink}</code>
        </div>
      )}
    </form>
  );
}
