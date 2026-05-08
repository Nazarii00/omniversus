import { PrismaPg } from "@prisma/adapter-pg";

import {
  PrismaClient,
  type PrismaClient as PrismaClientInstance,
} from "@/generated/prisma/client";

export type { PrismaClientInstance };

type GlobalPrismaCache = {
  omniversusPrisma?: PrismaClientInstance;
  omniversusPrismaUrl?: string;
};

const globalPrisma = globalThis as typeof globalThis & GlobalPrismaCache;

export function getDatabaseUrl(): string {
  return process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
}

export function hasDatabaseUrl(): boolean {
  return getDatabaseUrl().trim().length > 0;
}

export function getPrisma(): PrismaClientInstance | null {
  const connectionString = getDatabaseUrl().trim();

  if (!connectionString) {
    return null;
  }

  if (
    globalPrisma.omniversusPrisma &&
    globalPrisma.omniversusPrismaUrl === connectionString
  ) {
    return globalPrisma.omniversusPrisma;
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  globalPrisma.omniversusPrisma = prisma;
  globalPrisma.omniversusPrismaUrl = connectionString;

  return prisma;
}
