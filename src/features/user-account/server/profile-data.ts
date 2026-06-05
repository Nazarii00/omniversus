import { getPrisma } from "@/server/db/prisma";
import type { BattleRunStatus } from "@/generated/prisma/enums";

/* ================================================================
   TYPES
   ================================================================ */

export interface UserProfileData {
  id: string;
  supabaseId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  clearance: string;
  reputation: number;
  credits: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileStats {
  user: UserProfileData;
  totalBattles: number;
  winRate: number;
  currentStreak: number;
  reputation: number;
  credits: number;
}

export interface BattleEntry {
  id: string;
  opponent: string;
  date: string;
  score: string;
  result: "win" | "loss" | "draw";
}

/* ================================================================
   HELPERS
   ================================================================ */

function extractBattleResult(
  status: string,
  resultPayload: unknown,
  fighterAName: string,
  fighterBName: string,
): "win" | "loss" | "draw" {
  if (status !== "COMPLETED") return "draw";

  if (
    resultPayload &&
    typeof resultPayload === "object" &&
    !Array.isArray(resultPayload)
  ) {
    const payload = resultPayload as Record<string, unknown>;
    const winner = payload.winner ?? payload.verdict;

    if (typeof winner === "string") {
      const w = winner.trim().toLowerCase();
      const a = fighterAName.trim().toLowerCase();
      const b = fighterBName.trim().toLowerCase();

      if (w === a) return "win";
      if (w === b) return "loss";
      if (w === "draw" || w === "tie") return "draw";
    }
  }

  return "draw";
}

function extractScore(resultPayload: unknown): {
  scoreA: number;
  scoreB: number;
} {
  if (
    resultPayload &&
    typeof resultPayload === "object" &&
    !Array.isArray(resultPayload)
  ) {
    const payload = resultPayload as Record<string, unknown>;
    const scoreA =
      typeof payload.scoreA === "number"
        ? payload.scoreA
        : typeof payload.score_a === "number"
          ? payload.score_a
          : 0;
    const scoreB =
      typeof payload.scoreB === "number"
        ? payload.scoreB
        : typeof payload.score_b === "number"
          ? payload.score_b
          : 0;
    return { scoreA, scoreB };
  }
  return { scoreA: 0, scoreB: 0 };
}

function computeCurrentStreak(battles: ("win" | "loss" | "draw")[]): number {
  let streak = 0;
  for (const r of battles) {
    if (r === "win") {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function formatDateDM(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

/* ================================================================
   DATA FUNCTIONS
   ================================================================ */

export async function getUserProfile(
  supabaseId: string,
): Promise<ProfileStats | null> {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      console.error("[getUserProfile] Prisma client not available");
      return null;
    }

    const user = await prisma.profile.findUnique({
      where: { supabaseId },
    });

    if (!user) {
      return null;
    }

    const battles = await prisma.battleRun.findMany({
      where: { createdByUserId: supabaseId },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        resultPayload: true,
        fighterAName: true,
        fighterBName: true,
      },
    });

    const totalBattles = battles.length;

    const results = battles.map((b) =>
      extractBattleResult(
        b.status,
        b.resultPayload,
        b.fighterAName,
        b.fighterBName,
      ),
    );

    const wins = results.filter((r) => r === "win").length;
    const winRate =
      totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0;
    const currentStreak = computeCurrentStreak(results);

    return {
      user: {
        id: user.id,
        supabaseId: user.supabaseId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        clearance: user.clearance,
        reputation: user.reputation,
        credits: user.credits,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      totalBattles,
      winRate,
      currentStreak,
      reputation: user.reputation,
      credits: user.credits,
    };
  } catch (error) {
    console.error("[getUserProfile] Error:", error);
    return null;
  }
}

export async function getUserBattles(
  supabaseId: string,
  limit = 50,
): Promise<BattleEntry[] | null> {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      console.error("[getUserBattles] Prisma client not available");
      return null;
    }

    const runs = await prisma.battleRun.findMany({
      where: { createdByUserId: supabaseId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        fighterAName: true,
        fighterBName: true,
        status: true,
        resultPayload: true,
        createdAt: true,
      },
    });

    return runs.map((run) => {
      const result = extractBattleResult(
        run.status,
        run.resultPayload,
        run.fighterAName,
        run.fighterBName,
      );
      const { scoreA, scoreB } = extractScore(run.resultPayload);

      return {
        id: run.id,
        opponent: run.fighterBName,
        date: formatDateDM(run.createdAt),
        score: `${scoreA}:${scoreB}`,
        result,
      };
    });
  } catch (error) {
    console.error("[getUserBattles] Error:", error);
    return null;
  }
}
