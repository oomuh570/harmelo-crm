/**
 * UI helpers — re-exports and client-safe utilities
 */

// Re-export server-side functions and types for use in server components
export {
  getCurrentUser,
  requireAdminPage,
  getTeam,
  getMemberProfile,
  getMemberFollowUps,
  getMemberActivity,
  getTeamPendingFollowUps,
  getInvitations,
  getTeamKpis,
  type UserRole,
  type CurrentUser,
  type TeamMember,
  type MemberProfile,
  type FollowUp,
  type Invitation,
  type KpiRow,
  type KpiRange,
} from '@/lib/server-data';

// Local type definition for client use
type KpiRange = { from: Date; to: Date };

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
