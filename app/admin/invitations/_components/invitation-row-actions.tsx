'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function InvitationRowActions({
  id,
  status,
}: {
  id: string;
  status: 'pending' | 'accepted' | 'expired';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<'resend' | 'revoke' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function resend() {
    setBusy('resend');
    setError(null);
    setInviteLink(null);
    try {
      const res = await fetch(`/api/admin/invitations/${id}/resend`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? `Failed (${res.status})`);
      else {
        setInviteLink(data.inviteLink ?? null);
        setTimeout(() => router.refresh(), 500);
      }
    } catch {
      setError('Network error');
    } finally {
      setBusy(null);
    }
  }

  async function revoke() {
    if (!confirm('Revoke this invitation?')) return;
    setBusy('revoke');
    setError(null);
    try {
      const res = await fetch(`/api/admin/invitations/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? `Failed (${res.status})`);
      else setTimeout(() => router.refresh(), 500);
    } catch {
      setError('Network error');
    } finally {
      setBusy(null);
    }
  }

  if (status === 'accepted') return <span className="text-xs text-gray-500">—</span>;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={resend}
          disabled={busy !== null}
          className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-300 hover:border-[#00D4B8] hover:text-[#00D4B8] cursor-pointer disabled:opacity-50"
        >
          {busy === 'resend' ? 'Resending…' : 'Resend'}
        </button>
        <button
          type="button"
          onClick={revoke}
          disabled={busy !== null}
          className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 cursor-pointer disabled:opacity-50"
        >
          {busy === 'revoke' ? 'Revoking…' : 'Revoke'}
        </button>
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
      {inviteLink && (
        <code className="max-w-xs truncate text-[10px] text-[#00D4B8]" title={inviteLink}>
          {inviteLink}
        </code>
      )}
    </div>
  );
}
