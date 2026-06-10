import { prismaOrThrow } from "@/features/admin/actions/formUtils";
import type { BattlesHistoryItem } from "@/features/user-account/model/types";
import { BattleRunStatus } from "@/generated/prisma/enums";

/**
 * Fetch battle history for a user, optionally capped at `limit` rows.
 */
export async function getUserBattles(
  userId: string,
  limit?: number,
): Promise<BattlesHistoryItem[]> {
  const prisma = prismaOrThrow();

  const runs = await prisma.battleRun.findMany({
    where: { createdByUserId: userId },
    orderBy: { createdAt: "desc" },
    ...(limit !== undefined ? { take: limit } : {}),
    select: {
      id: true,
      fighterAName: true,
      fighterBName: true,
      status: true,
      resultPayload: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return runs.map((run) => ({
    id: run.id,
    fighterA: run.fighterAName,
    fighterB: run.fighterBName,
    status: run.status,
    winner: extractWinner(run.status, run.resultPayload),
    createdAt: run.createdAt,
    completedAt: run.completedAt,
  }));
}

/** @deprecated Use `getUserBattles(userId, limit)` instead. */
export async function getRecentBattles(
  userId: string,
  limit: number,
): Promise<BattlesHistoryItem[]> {
  return getUserBattles(userId, limit);
}

/** @deprecated Use `getUserBattles(userId)` instead. */
export async function getAllBattles(
  userId: string,
): Promise<BattlesHistoryItem[]> {
  return getUserBattles(userId);
}

function extractWinner(
  status: BattleRunStatus,
  resultPayload: unknown,
): string | null {
  if (status !== BattleRunStatus.COMPLETED) return null;
  if (
    !resultPayload ||
    typeof resultPayload !== "object" ||
    Array.isArray(resultPayload)
  ) {
    return null;
  }

  const payload = resultPayload as Record<string, unknown>;
  const winner = payload.winner ?? payload.verdict;

  return typeof winner === "string" ? winner : null;
}
