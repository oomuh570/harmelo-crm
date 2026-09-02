import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { ContactType } from '@/lib/generated/prisma/client';
import { revalidatePath } from 'next/cache';
import { Readable } from 'stream';
import csvParser from 'csv-parser';

export async function POST(request: Request) {
  try {
    // Get user session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = decrypt(sessionCookie);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const workspaceId = formData.get('workspaceId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be CSV' }, { status: 400 });
    }

    // Check workspace access (must be EDITOR+)
    const access = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId,
        userId: session.userId,
      },
    });

    if (!access || (access.role !== 'EDITOR' && access.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Only editors can import contacts' }, { status: 403 });
    }

    // Convert file to stream
    const buffer = await file.arrayBuffer();
    const stream = Readable.from(Buffer.from(buffer));

    // Parse CSV
    const rows: Record<string, string>[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (row) => {
          rows.push(row);
        })
        .on('error', (error) => {
          reject(new Error(`CSV parse error: ${error.message}`));
        })
        .on('end', () => {
          resolve(null);
        });
    });

    // Validate and create contacts
    let successCount = 0;
    let skipCount = 0;
    const seenEmails = new Set<string>(); // Track emails in this batch
    const allowedTypes = [
      'FEDERAL',
      'PROVINCIAL',
      'US',
      'INVESTOR',
      'CUSTOMER',
      'PARTNER',
      'OTHER',
    ];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;

      try {
        // Validate required fields
        const name = row.name?.trim();
        const email = row.email?.trim();
        const typeStr = (row.type?.trim() || 'OTHER').toUpperCase();

        if (!name) {
          errors.push({ row: rowNumber, error: 'Name is required' });
          skipCount++;
          continue;
        }

        if (!email) {
          errors.push({ row: rowNumber, error: 'Email is required' });
          skipCount++;
          continue;
        }

        if (!email.includes('@')) {
          errors.push({ row: rowNumber, error: 'Invalid email format' });
          skipCount++;
          continue;
        }

        if (!allowedTypes.includes(typeStr)) {
          errors.push({ row: rowNumber, error: `Invalid type: ${typeStr}` });
          skipCount++;
          continue;
        }

        // Check for duplicate within this import batch
        if (seenEmails.has(email)) {
          errors.push({ row: rowNumber, error: 'Duplicate in this import' });
          skipCount++;
          continue;
        }
        seenEmails.add(email);

        // Check if contact already exists in this workspace
        const existing = await prisma.contact.findFirst({
          where: { email, workspaceId, deletedAt: null },
        });

        if (existing) {
          errors.push({ row: rowNumber, error: 'Contact already exists in workspace' });
          skipCount++;
          continue;
        }

        // Create contact
        const contact = await prisma.contact.create({
          data: {
            name,
            email,
            phone: row.phone?.trim() || null,
            organization: row.organization?.trim() || null,
            jobTitle: row.jobTitle?.trim() || null,
            type: typeStr as ContactType,
            address: row.address?.trim() || null,
            notes: row.notes?.trim() || null,
            workspaceId,
          },
        });

        // Handle tags if provided (separated by semicolons)
        if (row.tags) {
          const tagNames = row.tags.split(';').map((t: string) => t.trim()).filter((t: string) => t.length > 0);

          for (const tagName of tagNames) {
            try {
              // Find or create tag
              let tag = await prisma.tag.findFirst({
                where: { name: tagName, deletedAt: null },
              });

              if (!tag) {
                tag = await prisma.tag.create({
                  data: { name: tagName },
                });
              }

              // Associate tag with contact
              await prisma.contactTag.create({
                data: {
                  contactId: contact.id,
                  tagId: tag.id,
                },
              });
            } catch (tagError) {
              console.error(`[import] Tag error for ${tagName} on contact ${contact.id}:`, tagError);
              // Continue with next tag even if this one fails
            }
          }
        }

        successCount++;
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        skipCount++;
      }
    }

    // Revalidate contacts page to show new contacts immediately
    revalidatePath('/contacts');

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      successCount,
      skipCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to import contacts' }, { status: 500 });
  }
}
