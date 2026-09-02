import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, ActivityType, FollowUpStatus } from '@/lib/generated/prisma/client';

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function stripHTML(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const typeParam = searchParams.get('type')?.trim() || '';
    const followUpStatusParam = searchParams.get('followUpStatus')?.trim() || '';

    const allowedTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE'];
    const allowedStatuses = ['PENDING', 'COMPLETED', 'CANCELLED'];

    const typeFilter = typeParam
      ? typeParam.split(',').filter((t) => allowedTypes.includes(t))
      : [];
    const statusFilter = followUpStatusParam
      ? followUpStatusParam.split(',').filter((s) => allowedStatuses.includes(s))
      : [];

    const where: Prisma.ActivityWhereInput = {
      deletedAt: null,
      contact: { deletedAt: null },
      ...(search
        ? {
            contact: {
              name: { contains: search, mode: 'insensitive' },
            },
          }
        : {}),
      ...(typeFilter.length > 0 ? { type: { in: typeFilter as ActivityType[] } } : {}),
      ...(statusFilter.length > 0
        ? { followUpStatus: { in: statusFilter as FollowUpStatus[] } }
        : {}),
    };

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { contact: true },
    });

    const rows = [
      [
        'Contact Name',
        'Activity Type',
        'Notes',
        'Occurred At',
        'Follow-up At',
        'Follow-up Status',
        'Created At',
      ]
        .map(escapeCSV)
        .join(','),
      ...activities
        .filter((a) => a.contact)
        .map((a) => {
          const notesPlain = stripHTML(a.notes);
          return [
            a.contact!.name,
            a.type,
            notesPlain,
            a.occurredAt.toISOString(),
            a.followUpAt?.toISOString() || '',
            a.followUpStatus || '',
            a.createdAt.toISOString(),
          ]
            .map(escapeCSV)
            .join(',');
        }),
    ].join('\n');

    const timestamp = new Date().toISOString().split('T')[0];

    return new NextResponse(rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="activities-${timestamp}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export activities error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
