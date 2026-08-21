'use server';

import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export type UserRole = 'VIEWER' | 'EDITOR' | 'ADMIN' | 'SUPER_ADMIN';

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  workspaceId: string | null;
};

export type TeamMember = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  createdAt: Date;
  lastActivityAt: Date | null;
};

export type MemberProfile = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  createdAt: Date;
  lastActivityAt: Date | null;
  metrics: {
    contactsOwned: number;
    activitiesLogged: number;
    followUpsCreated: number;
    followUpsCompleted: number;
  } | null;
};

type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';

export type FollowUp = {
  id: string;
  type: ActivityType;
  notes: string;
  followUpAt: Date;
  contact: {
    id: string;
    name: string;
  } | null;
  owner?: {
    id: string;
    fullName: string;
  };
};

export type Invitation = {
  id: string;
  email: string;
  role: 'VIEWER' | 'EDITOR' | 'ADMIN';
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  invitedBy: { id: string; fullName: string };
  status: 'accepted' | 'expired' | 'pending';
};

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

/** Get current signed-in user from session */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return null;
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: (user.role as UserRole),
      workspaceId: user.workspaceId,
    };
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    return null;
  }
}

/** Require admin access and return current user */
export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }
  return user;
}

export async function getTeam(): Promise<TeamMember[]> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) return [];

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') return [];

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user?.workspaceId) return [];

    const teamMembers = await prisma.user.findMany({
      where: { workspaceId: user.workspaceId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
        lastActivityAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return teamMembers.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      email: m.email,
      phoneNumber: m.phoneNumber,
      role: (m.role as UserRole),
      createdAt: m.createdAt,
      lastActivityAt: m.lastActivityAt,
    }));
  } catch (error) {
    console.error('Failed to fetch team:', error);
    return [];
  }
}

export async function getMemberProfile(userId: string): Promise<MemberProfile | null> {
  try {
    const metrics = await prisma.userMetrics.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!metrics) return null;

    return {
      id: metrics.user.id,
      fullName: metrics.user.fullName,
      email: metrics.user.email,
      phoneNumber: metrics.user.phoneNumber,
      role: metrics.user.role,
      createdAt: metrics.user.createdAt,
      lastActivityAt: metrics.user.lastActivityAt,
      metrics: {
        contactsOwned: metrics.contactsOwned,
        activitiesLogged: metrics.activitiesLogged,
        followUpsCreated: metrics.followUpsCreated,
        followUpsCompleted: metrics.followUpsCompleted,
      },
    };
  } catch (error) {
    console.error('Failed to fetch member profile:', error);
    return null;
  }
}

export async function getMemberFollowUps(userId: string): Promise<FollowUp[]> {
  try {
    const followUps = await prisma.followUpTask.findMany({
      where: { assignedToUserId: userId, status: 'PENDING' },
      include: {
        contact: {
          select: { id: true, name: true },
        },
        assignedTo: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return followUps.map((f) => ({
      id: f.id,
      type: 'NOTE' as ActivityType,
      notes: f.notes || '',
      followUpAt: f.dueDate,
      contact: f.contact,
      owner: f.assignedTo,
    }));
  } catch (error) {
    console.error('Failed to fetch member follow-ups:', error);
    return [];
  }
}

export async function getMemberActivity(userId: string): Promise<any[]> {
  try {
    const activities = await prisma.activity.findMany({
      where: { userId, deletedAt: null },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            organization: true,
            jobTitle: true,
            type: true,
            address: true,
            notes: true,
            createdAt: true,
            tags: { include: { tag: true } },
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: 50,
    });

    return activities.map((a) => ({
      id: a.id,
      type: a.type,
      notes: a.notes,
      occurredAt: a.occurredAt,
      contact: a.contact ? {
        id: a.contact.id,
        name: a.contact.name,
        email: a.contact.email ?? '',
        phone: a.contact.phone ?? '',
        organization: a.contact.organization ?? '',
        jobTitle: a.contact.jobTitle ?? '',
        type: a.contact.type,
        address: a.contact.address ?? '',
        notes: a.contact.notes ?? '',
        createdAt: a.contact.createdAt,
        tags: a.contact.tags?.map((ct) => ({ id: ct.tag.id, name: ct.tag.name, color: ct.tag.color })) ?? [],
      } : null,
    }));
  } catch (error) {
    console.error('Failed to fetch member activity:', error);
    return [];
  }
}

export async function getTeamPendingFollowUps(range?: KpiRange): Promise<FollowUp[]> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) return [];

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') return [];

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user?.workspaceId) return [];

    const whereClause: any = { workspaceId: user.workspaceId, status: 'PENDING' };
    if (range) {
      whereClause.dueDate = { gte: range.from, lte: range.to };
    }

    const followUps = await prisma.followUpTask.findMany({
      where: whereClause,
      include: {
        contact: {
          select: { id: true, name: true },
        },
        assignedTo: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return followUps.map((f) => ({
      id: f.id,
      type: 'NOTE' as ActivityType,
      notes: f.notes || '',
      followUpAt: f.dueDate,
      contact: f.contact,
      owner: f.assignedTo,
    }));
  } catch (error) {
    console.error('Failed to fetch team follow-ups:', error);
    return [];
  }
}

export async function getInvitations(): Promise<Invitation[]> {
  try {
    const now = new Date();
    const invitations = await prisma.invitation.findMany({
      include: {
        invitedBy: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => {
      let status: 'accepted' | 'expired' | 'pending';
      if (inv.acceptedAt) {
        status = 'accepted';
      } else if (inv.expiresAt < now) {
        status = 'expired';
      } else {
        status = 'pending';
      }

      return {
        id: inv.id,
        email: inv.email,
        role: (inv.role as 'VIEWER' | 'EDITOR' | 'ADMIN'),
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        invitedBy: inv.invitedBy,
        status,
      };
    });
  } catch (error) {
    console.error('Failed to fetch invitations:', error);
    return [];
  }
}

export async function getTeamKpis(
  range: KpiRange,
  userId?: string,
): Promise<{ perUser: KpiRow[]; totals: KpiRow }> {
  try {
    // Get current user's workspace
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) return { perUser: [], totals: emptyKpiRow() };

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') {
      return { perUser: [], totals: emptyKpiRow() };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId as string },
      select: { workspaceId: true },
    });

    if (!currentUser?.workspaceId) return { perUser: [], totals: emptyKpiRow() };

    // Get team members in workspace
    const teamMembers = await prisma.user.findMany({
      where: {
        workspaceId: currentUser.workspaceId,
        ...(userId && { id: userId }),
      },
      select: { id: true, fullName: true },
    });

    const teamMemberIds = new Set(teamMembers.map(m => m.id));

    let whereClause: any = {
      occurredAt: { gte: range.from, lte: range.to },
      deletedAt: null,
      userId: { in: Array.from(teamMemberIds) },
    };

    if (userId) {
      whereClause.userId = userId;
    }

    const activities = await prisma.activity.findMany({
      where: whereClause,
      select: { userId: true, type: true },
    });

    const userActivityMap = new Map<string, any>();

    for (const activity of activities) {
      if (!userActivityMap.has(activity.userId)) {
        userActivityMap.set(activity.userId, {
          calls: 0,
          emails: 0,
          meetings: 0,
          notes: 0,
        });
      }

      const stats = userActivityMap.get(activity.userId);
      if (activity.type === 'CALL') stats.calls++;
      if (activity.type === 'EMAIL') stats.emails++;
      if (activity.type === 'MEETING') stats.meetings++;
      if (activity.type === 'NOTE') stats.notes++;
    }

    // Get follow-ups for each user within the date range
    const now = new Date();
    let followUpWhere: any = {
      workspaceId: currentUser.workspaceId,
      dueDate: { gte: range.from, lte: range.to },
    };

    if (userId) {
      followUpWhere.assignedToUserId = userId;
    }

    const followUps = await prisma.followUpTask.findMany({
      where: followUpWhere,
      select: { assignedToUserId: true, status: true, dueDate: true },
    });

    const followUpMap = new Map<string, { pending: number; overdue: number; completed: number }>();
    for (const fu of followUps) {
      if (!followUpMap.has(fu.assignedToUserId)) {
        followUpMap.set(fu.assignedToUserId, { pending: 0, overdue: 0, completed: 0 });
      }

      const stats = followUpMap.get(fu.assignedToUserId)!;
      if (fu.status === 'COMPLETED') {
        stats.completed++;
      } else if (fu.status === 'PENDING') {
        if (fu.dueDate < now) {
          stats.overdue++;
        } else {
          stats.pending++;
        }
      }
    }

    const userMap = new Map(teamMembers.map(u => [u.id, u.fullName]));

    const perUser: KpiRow[] = [];
    let totals = emptyKpiRow();

    for (const member of teamMembers) {
      const stats = userActivityMap.get(member.id) || {
        calls: 0,
        emails: 0,
        meetings: 0,
        notes: 0,
      };

      const followUpStats = followUpMap.get(member.id) || {
        pending: 0,
        overdue: 0,
        completed: 0,
      };

      const row: KpiRow = {
        userId: member.id,
        fullName: member.fullName,
        calls: stats.calls,
        emails: stats.emails,
        meetings: stats.meetings,
        notes: stats.notes,
        followUpsPending: followUpStats.pending,
        followUpsOverdue: followUpStats.overdue,
        followUpsCompleted: followUpStats.completed,
        contactsTouched: 0,
      };

      perUser.push(row);
      totals.calls += row.calls;
      totals.emails += row.emails;
      totals.meetings += row.meetings;
      totals.notes += row.notes;
      totals.followUpsPending += row.followUpsPending;
      totals.followUpsOverdue += row.followUpsOverdue;
      totals.followUpsCompleted += row.followUpsCompleted;
    }

    return { perUser, totals };
  } catch (error) {
    console.error('Failed to calculate KPIs:', error);
    return { perUser: [], totals: emptyKpiRow() };
  }
}

export async function getAllWorkspaces(): Promise<
  { id: string; name: string; memberCount: number; contactCount: number; createdAt: Date }[]
> {
  try {
    const workspaces = await prisma.workspace.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        users: { select: { id: true } },
        contacts: { where: { deletedAt: null }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return workspaces.map((ws) => ({
      id: ws.id,
      name: ws.name,
      memberCount: ws.users.length,
      contactCount: ws.contacts.length,
      createdAt: ws.createdAt,
    }));
  } catch (error) {
    console.error('Failed to fetch workspaces:', error);
    return [];
  }
}

export async function getAllInvitations(): Promise<
  (Invitation & { workspace: { id: string; name: string } })[]
> {
  try {
    const now = new Date();
    const invitations = await prisma.invitation.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
        workspace: { select: { id: true, name: true } },
        invitedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => {
      let status: 'accepted' | 'expired' | 'pending';
      if (inv.acceptedAt) {
        status = 'accepted';
      } else if (inv.expiresAt < now) {
        status = 'expired';
      } else {
        status = 'pending';
      }

      return {
        id: inv.id,
        email: inv.email,
        role: inv.role as 'VIEWER' | 'EDITOR' | 'ADMIN',
        workspace: inv.workspace,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        invitedBy: inv.invitedBy,
        status,
      };
    });
  } catch (error) {
    console.error('Failed to fetch all invitations:', error);
    return [];
  }
}

export async function getAllPendingFollowUps(): Promise<
  {
    id: string;
    notes: string;
    dueDate: Date;
    workspace: { id: string; name: string };
    assignedTo: { id: string; fullName: string };
    contact: { id: string; name: string } | null;
  }[]
> {
  try {
    const followUps = await prisma.followUpTask.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        notes: true,
        dueDate: true,
        workspace: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, fullName: true } },
        contact: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 100,
    });

    return followUps.map(f => ({
      ...f,
      notes: f.notes || '',
    }));
  } catch (error) {
    console.error('Failed to fetch pending follow-ups:', error);
    return [];
  }
}

export async function getMyWorkspaces(): Promise<{ id: string; name: string }[]> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) return [];

    const session = decrypt(sessionCookie);
    if (!session?.userId || typeof session.userId !== 'string') return [];

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { workspaceId: true },
    });

    if (!user?.workspaceId) return [];

    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
      select: { id: true, name: true },
    });

    return workspace ? [workspace] : [];
  } catch (error) {
    console.error('Failed to fetch user workspaces:', error);
    return [];
  }
}

