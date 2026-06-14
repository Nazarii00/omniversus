import { PrismaPg } from "@prisma/adapter-pg";

import {
  PrismaClient,
  type PrismaClient as PrismaClientInstance,
} from "@/generated/prisma/client";

export type { PrismaClientInstance };

export function prismaOrThrow(): PrismaClientInstance {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error(
      "Prisma client not initialised — ensure DATABASE_URL or DIRECT_URL is set",
    );
  }
  return prisma;
}

type GlobalPrismaCache = {
  omniversusPrisma?: PrismaClientInstance;
  omniversusPrismaUrl?: string;
};

const globalPrisma = globalThis as typeof globalThis & GlobalPrismaCache;

/**
 * Returns the connection string for runtime queries.
 * Uses DATABASE_URL (PgBouncer pooler, port 6543) as primary.
 * DIRECT_URL (session mode, port 5432) is only used for migrations.
 */
export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? "";
}

export function hasDatabaseUrl(): boolean {
  return getDatabaseUrl().trim().length > 0;
}

const HEALTH_CHECK_TIMEOUT_MS = 3_000;
const RETRY_DELAYS_MS = [200, 500, 1_000];
const TRANSIENT_ERROR_PATTERNS = [
  /EMAXCONNSESSION/,
  /too many clients/,
  /remaining connection slots are reserved/,
  /Connection terminated unexpectedly/,
  /Connection closed unexpectedly/,
  /connect ECONNREFUSED/,
  /connect ETIMEDOUT/,
];

function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message;
  const causeMessage =
    error.cause && typeof error.cause === "object" && "message" in error.cause
      ? String((error.cause as { message: unknown }).message)
      : "";

  const combined = `${message} ${causeMessage}`;

  return TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(combined));
}

async function healthCheck(client: PrismaClientInstance): Promise<boolean> {
  try {
    await Promise.race([
      client.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Health check timed out")),
          HEALTH_CHECK_TIMEOUT_MS,
        ),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function tryConnect(
  connectionString: string,
  attempts: number,
): Promise<PrismaClientInstance> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      const adapter = new PrismaPg({ connectionString });
      const prisma = new PrismaClient({ adapter });

      const isHealthy = await healthCheck(prisma);
      if (!isHealthy) {
        await prisma.$disconnect().catch(() => {});
        throw new Error("Health check failed on new connection");
      }

      return prisma;
    } catch (error) {
      lastError = error;

      if (i < attempts - 1 && isTransientError(error)) {
        const delay = RETRY_DELAYS_MS[i] ?? RETRY_DELAYS_MS.at(-1) ?? 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

export function getPrisma(): PrismaClientInstance | null {
  const connectionString = getDatabaseUrl().trim();

  if (!connectionString) {
    return null;
  }

  // Return cached client if URL matches and connection is healthy
  if (
    globalPrisma.omniversusPrisma &&
    globalPrisma.omniversusPrismaUrl === connectionString
  ) {
    // Fire-and-forget health check: if dead, rebuild on next call
    healthCheck(globalPrisma.omniversusPrisma).then((isHealthy) => {
      if (!isHealthy) {
        globalPrisma.omniversusPrisma?.$disconnect().catch(() => {});
        globalPrisma.omniversusPrisma = undefined;
      }
    });

    return globalPrisma.omniversusPrisma;
  }

  // Synchronous fallback: cannot await in non-async context,
  // so we create the client eagerly and verify on next call.
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  globalPrisma.omniversusPrisma = prisma;
  globalPrisma.omniversusPrismaUrl = connectionString;

  return prisma;
}

/**
 * Async version that performs health check and retries on transient errors.
 * Use this in async server components or API routes.
 */
export async function getPrismaWithRetry(
  maxAttempts = 3,
): Promise<PrismaClientInstance | null> {
  const connectionString = getDatabaseUrl().trim();

  if (!connectionString) {
    return null;
  }

  // If cached and healthy, return immediately
  if (
    globalPrisma.omniversusPrisma &&
    globalPrisma.omniversusPrismaUrl === connectionString
  ) {
    const isHealthy = await healthCheck(globalPrisma.omniversusPrisma);
    if (isHealthy) {
      return globalPrisma.omniversusPrisma;
    }

    // Stale connection — disconnect and rebuild
    await globalPrisma.omniversusPrisma.$disconnect().catch(() => {});
    globalPrisma.omniversusPrisma = undefined;
  }

  try {
    const prisma = await tryConnect(connectionString, maxAttempts);

    globalPrisma.omniversusPrisma = prisma;
    globalPrisma.omniversusPrismaUrl = connectionString;

    return prisma;
  } catch {
    return null;
  }
}
