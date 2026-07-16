import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, ContactType } from '@/lib/generated/prisma/client';

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
    const tagIdsParam = searchParams.get('tagIds')?.trim() || '';

    const allowedTypes = [
      'FEDERAL',
      'PROVINCIAL',
      'US',
      'INVESTOR',
      'CUSTOMER',
      'PARTNER',
      'OTHER',
    ];
    const typeFilter = typeParam
      ? typeParam.split(',').filter((t) => allowedTypes.includes(t))
      : [];
    const tagIdsFilter = tagIdsParam ? tagIdsParam.split(',').filter(Boolean) : [];

    const where: Prisma.ContactWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { organization: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(typeFilter.length > 0 ? { type: { in: typeFilter as ContactType[] } } : {}),
      ...(tagIdsFilter.length > 0 ? { tags: { some: { tagId: { in: tagIdsFilter } } } } : {}),
    };

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        tags: { include: { tag: true } },
      },
    });

    const rows = [
      [
        'Name',
        'Email',
        'Phone',
        'Organization',
        'Job Title',
        'Type',
        'Address',
        'Tags',
        'Notes',
        'Created At',
      ]
        .map(escapeCSV)
        .join(','),
      ...contacts.map((c) => {
        const tagNames = c.tags.map((ct) => ct.tag.name).join('; ');
        const notesPlain = stripHTML(c.notes);
        return [
          c.name,
          c.email || '',
          c.phone || '',
          c.organization || '',
          c.jobTitle || '',
          c.type,
          c.address || '',
          tagNames,
          notesPlain,
          c.createdAt.toISOString(),
        ]
          .map(escapeCSV)
          .join(',');
      }),
    ].join('\n');

    const timestamp = new Date().toISOString().split('T')[0];

    return new NextResponse(rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="contacts-${timestamp}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export contacts error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

