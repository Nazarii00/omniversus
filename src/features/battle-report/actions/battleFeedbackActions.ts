"use server";

import { revalidatePath } from "next/cache";
import { BattleFeedbackValue } from "@/generated/prisma/enums";
import { getPrisma } from "@/server/db/prisma";
import { getCurrentUser } from "@/features/user-account/logic/getCurrentUser";
import { withActionRateLimit } from "@/features/user-account/actions/withActionRateLimit";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubmitFeedbackInput = {
  battleRunId: string;
  value: BattleFeedbackValue;
  reason?: string;
};

export type SubmitFeedbackResult =
  | { success: true; feedbackId: string }
  | {
      success: false;
      error: string;
      code: "unauthenticated" | "not_found" | "duplicate" | "unknown";
    };

export type BattleFeedbackStats = {
  total: number;
  agree: number;
  disagree: number;
  uncertain: number;
  agreePercent: number;
  disagreePercent: number;
  uncertainPercent: number;
};

export type GetFeedbackStatsResult =
  | { success: true; stats: BattleFeedbackStats }
  | { success: false; error: string; code: "unknown" };

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

async function _submitBattleFeedback(
  input: SubmitFeedbackInput,
): Promise<SubmitFeedbackResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "You must be logged in to submit feedback.",
      code: "unauthenticated",
    };
  }

  const prisma = getPrisma();
  if (!prisma) {
    return {
      success: false,
      error: "Database is not available.",
      code: "unknown",
    };
  }

  try {
    // Verify the battle run exists
    const battleRun = await prisma.battleRun.findUnique({
      where: { id: input.battleRunId },
      select: { id: true },
    });

    if (!battleRun) {
      return {
        success: false,
        error: "Battle run not found.",
        code: "not_found",
      };
    }

    // Look up the user's profile for the userId FK
    const profile = await prisma.profile.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return {
        success: false,
        error: "User profile not found.",
        code: "unauthenticated",
      };
    }

    // Upsert: one feedback per user per battle run (@@unique constraint)
    const feedback = await prisma.battleFeedback.upsert({
      where: {
        battleRunId_userId: {
          battleRunId: input.battleRunId,
          userId: profile.id,
        },
      },
      create: {
        battleRunId: input.battleRunId,
        userId: profile.id,
        value: input.value,
        reason: input.reason ?? null,
      },
      update: {
        value: input.value,
        reason: input.reason ?? null,
      },
      select: { id: true },
    });

    revalidatePath(`/battles/${input.battleRunId}`);

    return { success: true, feedbackId: feedback.id };
  } catch (error) {
    console.error("[BATTLE_FEEDBACK] submit failed", error);
    return {
      success: false,
      error: "Failed to submit feedback.",
      code: "unknown",
    };
  }
}

async function _getBattleFeedbackStats(
  battleRunId: string,
): Promise<GetFeedbackStatsResult> {
  const prisma = getPrisma();
  if (!prisma) {
    return {
      success: false,
      error: "Database is not available.",
      code: "unknown",
    };
  }

  try {
    const feedbacks = await prisma.battleFeedback.findMany({
      where: { battleRunId },
      select: { value: true },
    });

    const total = feedbacks.length;
    const agree = feedbacks.filter(
      (f) => f.value === BattleFeedbackValue.AGREE,
    ).length;
    const disagree = feedbacks.filter(
      (f) => f.value === BattleFeedbackValue.DISAGREE,
    ).length;
    const uncertain = feedbacks.filter(
      (f) => f.value === BattleFeedbackValue.UNCERTAIN,
    ).length;

    const stats: BattleFeedbackStats = {
      total,
      agree,
      disagree,
      uncertain,
      agreePercent: total > 0 ? Math.round((agree / total) * 100) : 0,
      disagreePercent: total > 0 ? Math.round((disagree / total) * 100) : 0,
      uncertainPercent: total > 0 ? Math.round((uncertain / total) * 100) : 0,
    };

    return { success: true, stats };
  } catch (error) {
    console.error("[BATTLE_FEEDBACK] stats failed", error);
    return {
      success: false,
      error: "Failed to fetch feedback stats.",
      code: "unknown",
    };
  }
}

export const submitBattleFeedback = withActionRateLimit(
  "feedback",
  _submitBattleFeedback,
);

export const getBattleFeedbackStats = _getBattleFeedbackStats;
