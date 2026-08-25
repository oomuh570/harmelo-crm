'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { type WorkspaceOption } from '@/components/workspace-label';

type Role = 'VIEWER' | 'EDITOR' | 'ADMIN';

export default function InviteForm({
  workspaces,
}: {
  workspaces: WorkspaceOption[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // Users belong to one workspace, so there's nothing to switch — use the first (and only) one.
  const active = workspaces[0] ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!active) {
      setError('You are not in any workspace yet.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setInviteLink(null);
    try {
      // Email-invite flow: creates an Invitation row and returns a signup link.
      // The endpoint reads the requesting admin's own workspace, so we don't pass it.
      const res = await fetch('/api/admin/invite-employee', {
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
        setTimeout(() => router.refresh(), 500);
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
          <span className="italic text-gray-500">no workspace</span>
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
          disabled={submitting || !active}
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
