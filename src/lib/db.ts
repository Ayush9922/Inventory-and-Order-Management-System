import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prismaClient: PrismaClient;

if (typeof window === 'undefined') {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/inventory_db';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  if (process.env.NODE_ENV === 'production') {
    prismaClient = new PrismaClient({ adapter });
  } else {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({
        adapter,
        log: ['query', 'error', 'warn'],
      });
    }
    prismaClient = globalForPrisma.prisma;
  }
} else {
  prismaClient = null as any;
}

export const db = prismaClient;
export type { PrismaClient };
