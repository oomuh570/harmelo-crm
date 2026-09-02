'use client';

import { useState } from 'react';
import { Merge } from 'lucide-react';
import { toast } from 'sonner';

type Contact = {
  id: string;
  name: string;
};

export default function MergeContactsDialog({
  selectedContacts,
  workspaceId,
  onMergeComplete,
}: {
  selectedContacts: Contact[];
  workspaceId: string;
  onMergeComplete: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [keepContactId, setKeepContactId] = useState(selectedContacts[0]?.id || '');

  if (selectedContacts.length !== 2) return null;

  const fromContact = selectedContacts.find((c) => c.id !== keepContactId);
  if (!fromContact) return null;

  async function handleMerge() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/contacts/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromContactId: fromContact!.id,
          toContactId: keepContactId,
          workspaceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Merge failed');
      }

      toast.success(`Merged ${fromContact!.name} into ${selectedContacts.find((c) => c.id === keepContactId)?.name}`);
      onMergeComplete();
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Merge failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0f1117] border border-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-2 mb-4">
          <Merge className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Merge Contacts</h2>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Keep all data from one contact and delete the other.
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Keep this contact:</label>
            <select
              value={keepContactId}
              onChange={(e) => setKeepContactId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded px-3 py-2"
            >
              {selectedContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded p-3">
            <p className="text-xs text-gray-400 mb-2">Delete:</p>
            <p className="text-sm text-white font-medium">{fromContact.name}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onMergeComplete()}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isLoading ? 'Merging...' : 'Merge'}
          </button>
        </div>
      </div>
    </div>
  );
}
