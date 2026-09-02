'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Mail, Wifi, RefreshCw } from 'lucide-react';

export default function SettingsClient({
  gmailConnected,
  gmailLastSync,
  workspaceId,
}: {
  gmailConnected: boolean;
  gmailLastSync: Date | null;
  workspaceId: string; // NEW
}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(gmailLastSync ? new Date(gmailLastSync) : null);

  // Poll for latest sync time every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const user = await res.json();
          if (user.gmailLastSync) {
            setLastSyncDate(new Date(user.gmailLastSync));
          }
        }
      } catch (error) {
        console.error('Failed to fetch latest sync time:', error);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []);

  async function handleConnectGmail() {
    setIsConnecting(true);
    // Redirect to OAuth flow
    window.location.href = '/api/auth/gmail/authorize';
  }

  async function handleSyncNow() {
    setIsSyncing(true);
    try {
      const syncRes = await fetch(`/api/gmail/sync?workspaceId=${workspaceId}`, {
        method: 'POST',
      });

      if (!syncRes.ok) {
        const error = await syncRes.json();
        throw new Error(error.error || 'Sync failed');
      }

      const result = await syncRes.json();
      toast.success(`Gmail sync complete! ${result.syncedCount} emails synced.`);

      // Update last sync time immediately
      setLastSyncDate(new Date());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync Gmail';
      toast.error(message);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDisconnectGmail() {
    if (!confirm('Are you sure you want to disconnect Gmail? Auto-syncing will stop.')) return;

    setIsDisconnecting(true);
    try {
      const res = await fetch('/api/auth/gmail/disconnect', { method: 'POST' });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Disconnect failed');
      }

      toast.success('Gmail disconnected');
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect Gmail';
      toast.error(message);
    } finally {
      setIsDisconnecting(false);
    }
  }

  const lastSyncTime = lastSyncDate
    ? lastSyncDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <div className="space-y-6">
      {/* Gmail Integration */}
      <div className="rounded-lg border border-gray-700 bg-[#0f1117] p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="h-5 w-5 text-[#00D4B8]" />
          <h2 className="text-lg font-semibold text-white">Gmail Integration</h2>
        </div>

        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Status</p>
              <p
                className={`text-sm font-medium ${gmailConnected ? 'text-[#00D4B8]' : 'text-gray-400'}`}
              >
                {gmailConnected ? '● Connected' : '● Not Connected'}
              </p>
            </div>
            {!gmailConnected ? (
              <button
                onClick={handleConnectGmail}
                disabled={isConnecting}
                className="px-4 py-2 bg-[#00D4B8] text-black text-sm font-medium rounded-md hover:bg-[#00D4B8]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Connect Gmail'}
              </button>
            ) : (
              <button
                onClick={handleDisconnectGmail}
                disabled={isDisconnecting}
                className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            )}
          </div>

          {/* Last Sync */}
          {gmailConnected && (
            <>
              <div className="pt-4 border-t border-gray-700">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Last Sync</p>
                <p className="text-sm text-gray-200">{lastSyncTime}</p>
              </div>

              {/* Sync Button */}
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="w-full mt-4 px-4 py-2 bg-[#00D4B8] text-black text-sm font-medium rounded-md hover:bg-[#00D4B8]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>

              <p className="text-xs text-gray-500 mt-2">
                Automatic sync runs every 10 minutes
              </p>
            </>
          )}

          {/* How it works */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">How it works</p>
            <ul className="text-xs text-gray-400 space-y-2">
              <li className="flex gap-2">
                <span className="text-[#00D4B8]">•</span>
                <span>Connect your Gmail account via OAuth</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#00D4B8]">•</span>
                <span>Emails are automatically logged as activities</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#00D4B8]">•</span>
                <span>Toggle sync on/off per contact</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
