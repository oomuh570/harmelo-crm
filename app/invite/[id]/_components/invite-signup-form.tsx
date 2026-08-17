'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function InviteSignupForm({
  invitationId,
  email: invitedEmail,
}: {
  invitationId: string;
  email: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(invitedEmail);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordErrors: string[] = [];
    if (password.length < 8) passwordErrors.push('Must be at least 8 characters');
    if (!/[0-9]/.test(password)) passwordErrors.push('Must contain at least one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) passwordErrors.push('Must contain a special character');
    if (!/[A-Z]/.test(password)) passwordErrors.push('Must contain an uppercase letter');

    if (passwordErrors.length > 0) {
      setError(`Password must:\n${passwordErrors.map(e => `• ${e}`).join('\n')}`);
      return;
    }

    setSubmitting(true);

    try {
      // Accept the invitation (which creates the user)
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationId,
          fullName,
          password,
          phoneNumber: phoneNumber || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create account');
      }

      // Redirect to login
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
          Email *
        </label>
        <input
          type="email"
          disabled
          value={email}
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-gray-500 outline-none cursor-not-allowed"
        />
        <p className="text-xs text-gray-500 mt-1">Email is locked to the invitation</p>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
          Phone
        </label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(formatPhone(e.target.value))}
          placeholder="123-456-7890"
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
          Password *
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
        />
        <p className="text-xs text-gray-500 mt-1">At least 8 characters, 1 number, 1 uppercase letter, and 1 special character</p>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
          Confirm Password *
        </label>
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={8}
          className="w-full rounded-md border border-gray-700 bg-[#07090F] px-3 py-2 text-sm text-white outline-none focus:border-[#00D4B8]"
        />
      </div>

      {error && (
        <div className="text-sm text-red-400 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-[#00D4B8] px-4 py-2 text-sm font-medium text-black hover:bg-[#00D4B8]/90 disabled:opacity-50 cursor-pointer"
      >
        {submitting ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
}
