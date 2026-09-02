'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const inputBase =
  'w-full rounded-md border border-gray-700 bg-[#07090F] py-2 pl-9 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-[#00D4B8] focus:ring-1 focus:ring-[#00D4B8]';
const iconClass = 'text-gray-500 absolute left-3 top-1/2 -translate-y-1/2';

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-sm text-red-400">Invalid or missing reset token</p>
        <a href="/login" className="mt-4 inline-block text-sm text-[#00D4B8] hover:text-[#00D4B8]/80">
          Back to login
        </a>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      toast.success('Password reset successfully');
      router.push('/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="relative">
          <FontAwesomeIcon icon={faLock} className={iconClass} />
          <FontAwesomeIcon
            onClick={() => setShowPassword(!showPassword)}
            icon={showPassword ? faEye : faEyeSlash}
            className="text-gray-500 hover:text-gray-300 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
          />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputBase} pr-9`}
            required
          />
        </div>

        <div className="relative">
          <FontAwesomeIcon icon={faLock} className={iconClass} />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`${inputBase} pr-3`}
            required
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <p className="text-xs text-gray-500">
          Password must be at least 8 characters
        </p>

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="w-full rounded-md bg-[#00D4B8] py-2 text-sm font-medium text-black hover:bg-[#00D4B8]/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </form>
  );
}
