/**
 * UI stubs — placeholder helpers + types so the frontend compiles and renders
 * without the backend that used to power it.
 *
 * REPLACE EACH FUNCTION WITH REAL DATA when wiring to the workspace backend.
 * Every function is marked TODO(backend) so it's easy to grep.
 */

export type UserRole = 'ADMIN' | 'MEMBER';

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

const PREVIEW_USER: CurrentUser = {
  id: 'preview-user',
  email: 'preview@example.com',
  fullName: 'Preview User',
  role: 'ADMIN',
};

/** TODO(backend): return the current signed-in user or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  return PREVIEW_USER;
}

/** TODO(backend): redirect non-admin users. Currently a no-op that returns a fake admin. */
export async function requireAdminPage(): Promise<CurrentUser> {
  return PREVIEW_USER;
}

export type KpiRow = {
  userId: string | null;
  fullName: string;
  calls: number;
  emails: number;
  meetings: number;
  notes: number;
  followUpsPending: number;
  followUpsOverdue: number;
  followUpsCompleted: number;
  contactsTouched: number;
};

export type KpiRange = { from: Date; to: Date };

function emptyKpiRow(fullName = 'Team totals'): KpiRow {
  return {
    userId: null,
    fullName,
    calls: 0,
    emails: 0,
    meetings: 0,
    notes: 0,
    followUpsPending: 0,
    followUpsOverdue: 0,
    followUpsCompleted: 0,
    contactsTouched: 0,
  };
}

/** TODO(backend): aggregate real KPIs. Returns empty rows so UI renders. */
export async function getTeamKpis(
  _range: KpiRange,
  _userId?: string,
): Promise<{ perUser: KpiRow[]; totals: KpiRow }> {
  return { perUser: [], totals: emptyKpiRow() };
}

export function thisWeekRange(now: Date = new Date()): KpiRange {
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  endOfWeek.setMilliseconds(-1);
  return { from: startOfWeek, to: endOfWeek };
}

/**
 * TODO(backend): replace with real fetch. Logs the request and returns a fake success
 * so client-side forms can complete their happy path without a real API.
 */
export async function stubFetch(input: string, init?: RequestInit): Promise<Response> {
  const method = init?.method ?? 'GET';
  const body = init?.body ? (typeof init.body === 'string' ? init.body : '[body]') : undefined;
  console.info('[ui-stub] TODO wire backend →', method, input, body ?? '');
  return new Response(JSON.stringify({ ok: true, stub: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function presetRange(
  preset: 'today' | 'week' | 'last30',
  now: Date = new Date(),
): KpiRange {
  if (preset === 'today') {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(from.getDate() + 1);
    to.setMilliseconds(-1);
    return { from, to };
  }
  if (preset === 'last30') {
    const to = new Date(now);
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from, to };
  }
  return thisWeekRange(now);
}
