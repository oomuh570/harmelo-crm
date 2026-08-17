'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Contact = {
  id: string;
  name: string;
};

export default function CreateFollowupForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('09:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContacts() {
      try {
        const res = await fetch('/api/contacts');
        if (res.ok) {
          const data = await res.json();
          setContacts(data.contacts || []);
        }
      } catch (err) {
        console.error('Failed to fetch contacts:', err);
      }
    }
    fetchContacts();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!followUpDate) {
      setError('Please select a follow-up date');
      return;
    }

    setSubmitting(true);

    try {
      const dueDate = new Date(`${followUpDate}T${followUpTime}`);

      const res = await fetch('/api/follow-ups-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          assignedToUserId: userId,
          dueDate: dueDate.toISOString(),
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create follow-up');
      }

      setContactId('');
      setNotes('');
      setFollowUpDate('');
      setFollowUpTime('09:00');
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
          Contact (optional)
        </label>
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white"
        >
          <option value="">No specific contact</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
            Date
          </label>
          <input
            type="date"
            required
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
            Time
          </label>
          <input
            type="time"
            value={followUpTime}
            onChange={(e) => setFollowUpTime(e.target.value)}
            className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Follow-up details..."
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-[#00D4B8] px-3 py-2 text-sm font-medium text-black hover:bg-[#00D4B8]/90 disabled:opacity-50 cursor-pointer"
      >
        {submitting ? 'Creating...' : 'Create follow-up'}
      </button>
    </form>
  );
}
