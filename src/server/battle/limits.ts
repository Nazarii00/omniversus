import { BattleRunStatus } from "@/generated/prisma/enums";
import { prismaOrThrow } from "@/server/db/prisma";

export interface DailyLimitCheck {
  allowed: boolean;
  limit: number;
  used: number;
  retryAfterSeconds: number | null;
}

const ADMIN_LIMIT = 200;
const USER_LIMIT = 50;

/**
 * Check if the given user has exceeded their daily battle quota.
 * Returns null if the user is unknown (anonymous) — no limit applies.
 */
export async function checkDailyBattleLimit(
  userId: string,
  clearance: string | null,
): Promise<DailyLimitCheck> {
  const prisma = prismaOrThrow();

  const isAdmin = clearance?.startsWith("SIGMA-5") ?? false;
  const limit = isAdmin ? ADMIN_LIMIT : USER_LIMIT;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const count = await prisma.battleRun.count({
    where: {
      createdByUserId: userId,
      createdAt: { gte: since },
      status: { not: BattleRunStatus.CANCELLED },
    },
  });

  if (count >= limit) {
    const retryAfterSeconds = Math.ceil(
      (since.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / 1000,
    );

    return {
      allowed: false,
      limit,
      used: count,
      retryAfterSeconds,
    };
  }

  return { allowed: true, limit, used: count, retryAfterSeconds: null };
}
