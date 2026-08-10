// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import SignupForm from '@/app/signup/SignUpForm';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  redirect: vi.fn(),
}));

// Signup action creates a session on success; stub it out (no cookies in jsdom).
vi.mock('@/lib/session', () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
}));

// SignUpAction posts to /api/auth/signup via fetch; capture its calls.
vi.mock('@/auth/signup-action', async () => {
  const actual = await vi.importActual<typeof import('@/auth/signup-action')>(
    '@/auth/signup-action',
  );
  return actual;
});

beforeEach(() => {
  refresh.mockClear();
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SignupForm with invitation', () => {
  it('locks the email field to the invited email and submits the token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'user-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <SignupForm invitationToken="tok-123" invitationEmail="invitee@example.com" />,
    );

    const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement;
    expect(emailInput.value).toBe('invitee@example.com');
    expect(emailInput).toHaveAttribute('readOnly');

    await userEvent.type(screen.getByPlaceholderText('Full Name'), 'Invitee');
    await userEvent.type(screen.getByPlaceholderText('Phone Number'), '4033302322');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.token).toBe('tok-123');
    expect(body.email).toBe('invitee@example.com');
  });
});
