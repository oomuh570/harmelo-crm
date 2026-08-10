// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import InviteForm from '@/app/admin/invitations/_components/invite-form';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

beforeEach(() => {
  refresh.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('InviteForm', () => {
  it('POSTs email + role and shows the invite link on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'inv-1',
        email: 'new@example.com',
        role: 'MEMBER',
        inviteLink: 'http://localhost:3000/signup?token=abc',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<InviteForm />);
    await userEvent.type(screen.getByPlaceholderText(/person@example/), 'new@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/invitations',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ email: 'new@example.com', role: 'MEMBER' });

    expect(await screen.findByText(/signup\?token=abc/)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it('shows the server error message when the invite fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'A user with this email already exists' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<InviteForm />);
    await userEvent.type(screen.getByPlaceholderText(/person@example/), 'dup@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send invite/i }));

    expect(
      await screen.findByText(/A user with this email already exists/),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
