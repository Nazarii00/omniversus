import { prismaOrThrow } from "@/features/admin/actions/formUtils";
import type { BattlesHistoryItem } from "@/features/user-account/model/types";
import { BattleRunStatus } from "@/generated/prisma/enums";

export async function getRecentBattles(
  userId: string,
  limit: number,
): Promise<BattlesHistoryItem[]> {
  const prisma = prismaOrThrow();

  const runs = await prisma.battleRun.findMany({
    where: { createdByUserId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
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

export async function getAllBattles(
  userId: string,
): Promise<BattlesHistoryItem[]> {
  const prisma = prismaOrThrow();

  const runs = await prisma.battleRun.findMany({
    where: { createdByUserId: userId },
    orderBy: { createdAt: "desc" },
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
