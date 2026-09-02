'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function EnterWorkspace({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleEnter() {
    setLoading(true);
    try {
      const res = await fetch('/api/workspaces/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });

      if (!res.ok) {
        throw new Error('Failed to select workspace');
      }

      toast.success('Workspace selected');
      router.push('/');
      router.refresh();
    } catch (error) {
      toast.error('Failed to select workspace');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleEnter}
      disabled={loading}
      className="rounded-md bg-[#00D4B8] px-3 py-1 text-xs font-medium text-black hover:bg-[#00D4B8]/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Loading...' : 'Enter'}
    </button>
  );
}
