/**
 * Prisma Database Client Singleton
 *
 * Provides a single, reusable instance of PrismaClient configured for PostgreSQL.
 * Uses the PostgreSQL adapter (@prisma/adapter-pg) to connect via DATABASE_URL.
 *
 * Connection pooling is handled by the adapter; the client instance is cached
 * globally in development to avoid creating multiple connections on hot reloads.
 *
 * Usage: import { prisma } from '@/lib/prisma'
 * Then use prisma.model.method(...) for any Prisma query
 *
 * Models available:
 * - prisma.contact (Contact)
 * - prisma.tag (Tag)
 * - prisma.contactTag (ContactTag) - junction table for many-to-many
 * - prisma.activity (Activity)
 * - prisma.user (User)
 *
 * Note: The generated client is located at ./generated/prisma/client
 * Regenerate it after schema changes with: npx prisma generate
 */

import { PrismaClient } from './generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

// Get PostgreSQL connection string from environment variables
const connectionString = process.env.DATABASE_URL;

// Initialize PostgreSQL adapter with connection pooling
// This handles efficient connection management to the database
const adapter = new PrismaPg({ connectionString });

// Type for global cache to avoid TypeScript issues
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client Singleton Pattern
 *
 * In development, cache the client instance globally to prevent creating
 * multiple connections on hot reload (which causes connection pool exhaustion).
 * In production, each instance is independent (handled by infrastructure).
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// Cache the client in development to survive hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
