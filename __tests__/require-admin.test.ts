import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const findFirst = vi.fn();
const decrypt = vi.fn();
const cookiesGet = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findFirst: (...args: unknown[]) => findFirst(...args) } },
}));

vi.mock('@/lib/session', () => ({
  decrypt: (...args: unknown[]) => decrypt(...args),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => cookiesGet(name) }),
}));

// React.cache memoizes results per module instance. Import fresh per test.
async function loadAuth() {
  vi.resetModules();
  return await import('@/lib/auth');
}

beforeEach(() => {
  findFirst.mockReset();
  decrypt.mockReset();
  cookiesGet.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('requireAdminApi', () => {
  it('returns 401 when there is no session', async () => {
    cookiesGet.mockReturnValue(undefined);
    decrypt.mockResolvedValue(null);
    const { requireAdminApi } = await loadAuth();

    const result = await requireAdminApi();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it('returns 403 when the user is not an admin', async () => {
    cookiesGet.mockReturnValue({ value: 'enc' });
    decrypt.mockResolvedValue({ userId: 'u1', email: 'm@example.com' });
    findFirst.mockResolvedValue({
      id: 'u1',
      email: 'm@example.com',
      fullName: 'Member',
      role: 'MEMBER',
    });
    const { requireAdminApi } = await loadAuth();

    const result = await requireAdminApi();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it('allows through when the user is an admin', async () => {
    cookiesGet.mockReturnValue({ value: 'enc' });
    decrypt.mockResolvedValue({ userId: 'a1', email: 'a@example.com' });
    findFirst.mockResolvedValue({
      id: 'a1',
      email: 'a@example.com',
      fullName: 'Admin',
      role: 'ADMIN',
    });
    const { requireAdminApi } = await loadAuth();

    const result = await requireAdminApi();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.role).toBe('ADMIN');
  });
});
