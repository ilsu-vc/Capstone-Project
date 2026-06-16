/**
 * @file prisma.client.ts
 * @description Singleton PrismaClient instance.
 *
 * Why singleton?  PrismaClient manages a connection pool. Importing it multiple
 * times would open multiple pools and exhaust database connections — a common
 * mistake in Express apps. This module guarantees exactly one instance per process.
 *
 * In test environments, the instance is attached to `globalThis` so Jest's module
 * hot-reloading does not create multiple clients.
 */

import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

// Use globalThis to survive hot-module-replacement in dev/test
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']  // Verbose in dev
        : ['warn', 'error'],                   // Quiet in prod
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
