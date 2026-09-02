'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';

const inputBase =
  'w-full rounded-md border border-gray-700 bg-[#07090F] py-2 pl-9 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-[#00D4B8] focus:ring-1 focus:ring-[#00D4B8]';
const iconClass = 'text-gray-500 absolute left-3 top-1/2 -translate-y-1/2';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send reset email');
      }

      setSubmitted(true);
      toast.success('Check your email for reset instructions');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <p className="text-sm text-gray-300">
          If an account exists with that email, you'll receive password reset instructions shortly.
        </p>
        <button
          onClick={() => {
            setEmail('');
            setSubmitted(false);
          }}
          className="mt-4 text-sm text-[#00D4B8] hover:text-[#00D4B8]/80"
        >
          Try another email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative mb-4">
        <FontAwesomeIcon icon={faEnvelope} className={iconClass} />
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputBase} pr-3`}
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading || !email}
        className="w-full rounded-md bg-[#00D4B8] py-2 text-sm font-medium text-black hover:bg-[#00D4B8]/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>
    </form>
  );
}
