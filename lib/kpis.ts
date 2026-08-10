import { prisma } from '@/lib/prisma';

export type KpiRow = {
  userId: string | null;         // null on totals row
  fullName: string;              // "Team totals" on totals row
  calls: number;
  emails: number;
  meetings: number;
  notes: number;
  followUpsPending: number;      // pending & due in the future
  followUpsOverdue: number;      // pending & due in the past
  followUpsCompleted: number;    // completed in range
  contactsTouched: number;       // distinct contacts with any activity in range
};

export type KpiRange = { from: Date; to: Date };

/**
 * Aggregate KPIs across the team, optionally scoped to a single user.
 * Returns per-user rows and a totals row.
 *
 * When userId is provided, perUser has one row (that user) and totals equals that row.
 */
export async function getTeamKpis(
  range: KpiRange,
  userId?: string,
): Promise<{ perUser: KpiRow[]; totals: KpiRow }> {
  const inRange = { gte: range.from, lte: range.to };
  const userFilter = userId ? { id: userId, deletedAt: null } : { deletedAt: null };
  const activityUserFilter = userId ? { userId } : {};

  const [users, activityByUserType, followUpsPending, followUpsOverdue, followUpsCompleted, contactsTouched] =
    await Promise.all([
      prisma.user.findMany({
        where: userFilter,
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' },
      }),
      prisma.activity.groupBy({
        by: ['userId', 'type'],
        where: {
          ...activityUserFilter,
          deletedAt: null,
          occurredAt: inRange,
          OR: [{ contactId: null }, { contact: { deletedAt: null } }],
        },
        _count: { _all: true },
      }),
      // Pending / overdue are point-in-time snapshots (relative to now), independent of range.
      prisma.activity.groupBy({
        by: ['userId'],
        where: {
          ...activityUserFilter,
          deletedAt: null,
          followUpStatus: 'PENDING',
          followUpAt: { gte: new Date() },
          OR: [{ contactId: null }, { contact: { deletedAt: null } }],
        },
        _count: { _all: true },
      }),
      prisma.activity.groupBy({
        by: ['userId'],
        where: {
          ...activityUserFilter,
          deletedAt: null,
          followUpStatus: 'PENDING',
          followUpAt: { lt: new Date() },
          OR: [{ contactId: null }, { contact: { deletedAt: null } }],
        },
        _count: { _all: true },
      }),
      prisma.activity.groupBy({
        by: ['userId'],
        where: {
          ...activityUserFilter,
          deletedAt: null,
          followUpStatus: 'COMPLETED',
          updatedAt: inRange,
          OR: [{ contactId: null }, { contact: { deletedAt: null } }],
        },
        _count: { _all: true },
      }),
      // Distinct contacts touched: group activities by (userId, contactId) in range, then count rows per userId.
      prisma.activity.groupBy({
        by: ['userId', 'contactId'],
        where: {
          ...activityUserFilter,
          deletedAt: null,
          occurredAt: inRange,
          OR: [{ contactId: null }, { contact: { deletedAt: null } }],
        },
      }),
    ]);

  const rowByUser = new Map<string, KpiRow>();
  for (const u of users) {
    rowByUser.set(u.id, {
      userId: u.id,
      fullName: u.fullName,
      calls: 0,
      emails: 0,
      meetings: 0,
      notes: 0,
      followUpsPending: 0,
      followUpsOverdue: 0,
      followUpsCompleted: 0,
      contactsTouched: 0,
    });
  }

  for (const g of activityByUserType) {
    const row = rowByUser.get(g.userId);
    if (!row) continue;
    const n = g._count._all;
    switch (g.type) {
      case 'CALL': row.calls += n; break;
      case 'EMAIL': row.emails += n; break;
      case 'MEETING': row.meetings += n; break;
      case 'NOTE': row.notes += n; break;
    }
  }
  for (const g of followUpsPending) {
    const row = rowByUser.get(g.userId);
    if (row) row.followUpsPending = g._count._all;
  }
  for (const g of followUpsOverdue) {
    const row = rowByUser.get(g.userId);
    if (row) row.followUpsOverdue = g._count._all;
  }
  for (const g of followUpsCompleted) {
    const row = rowByUser.get(g.userId);
    if (row) row.followUpsCompleted = g._count._all;
  }
  const touchedByUser = new Map<string, number>();
  for (const g of contactsTouched) {
    touchedByUser.set(g.userId, (touchedByUser.get(g.userId) ?? 0) + 1);
  }
  for (const [uid, n] of touchedByUser) {
    const row = rowByUser.get(uid);
    if (row) row.contactsTouched = n;
  }

  const perUser = Array.from(rowByUser.values());
  const totals: KpiRow = perUser.reduce<KpiRow>(
    (acc, r) => ({
      userId: null,
      fullName: 'Team totals',
      calls: acc.calls + r.calls,
      emails: acc.emails + r.emails,
      meetings: acc.meetings + r.meetings,
      notes: acc.notes + r.notes,
      followUpsPending: acc.followUpsPending + r.followUpsPending,
      followUpsOverdue: acc.followUpsOverdue + r.followUpsOverdue,
      followUpsCompleted: acc.followUpsCompleted + r.followUpsCompleted,
      contactsTouched: acc.contactsTouched + r.contactsTouched,
    }),
    {
      userId: null,
      fullName: 'Team totals',
      calls: 0, emails: 0, meetings: 0, notes: 0,
      followUpsPending: 0, followUpsOverdue: 0, followUpsCompleted: 0,
      contactsTouched: 0,
    },
  );

  return { perUser, totals };
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

export function presetRange(preset: 'today' | 'week' | 'last30', now: Date = new Date()): KpiRange {
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
