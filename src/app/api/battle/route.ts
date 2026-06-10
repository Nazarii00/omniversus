import { NextRequest, NextResponse } from "next/server";

import {
  BattleAnalysisError,
  buildBattleCacheKey,
  checkDailyBattleLimit,
  completeBattleRunRecord,
  computeBattleQualityScore,
  createBattleRunRecord,
  failBattleRunRecord,
  findCachedBattleResult,
  orientBattleResultForRequest,
  runBattleAnalysisWithMetadata,
  type RunBattleAnalysisOptions,
} from "@/server/battle";
import { getPrisma } from "@/server/db/prisma";
import { createServerSupabaseClient } from "@/server/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  body: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = body[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function readBoolean(body: Record<string, unknown>, key: string): boolean {
  return body[key] === true;
}

function readOptions(body: Record<string, unknown>): RunBattleAnalysisOptions {
  if (isRecord(body.options)) {
    const options = { ...(body.options as RunBattleAnalysisOptions) };

    // Keep generation settings server-pinned while the UI layer is being built.
    delete options.model;
    delete options.temperature;
    delete options.topP;
    delete options.maxCompletionTokens;
    delete options.thinkingLevel;

    return options;
  }

  return {};
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Battle analysis failed";
}

function errorStatus(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    const status = (error as { status: number }).status;
    if (status >= 400 && status < 600) return status;
  }

  return 500;
}

function errorGeneration(error: unknown) {
  return error instanceof BattleAnalysisError ? error.generation : null;
}

function validationIssues(error: unknown): unknown[] | null {
  return error instanceof BattleAnalysisError ? error.validationIssues : null;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 },
    );
  }

  const fighterA = readString(body, ["fighterA", "characterA", "a"]);
  const fighterB = readString(body, ["fighterB", "characterB", "b"]);

  if (!fighterA || !fighterB) {
    return NextResponse.json(
      { error: "fighterA and fighterB are required" },
      { status: 400 },
    );
  }

  const options = readOptions(body);
  const forceRefresh = readBoolean(body, "forceRefresh");

  // --- Resolve user ---------------------------------------------------------
  let userId: string | null = null;
  let userClearance: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;

      const prisma = getPrisma();
      if (prisma) {
        const profile = await prisma.profile.findUnique({
          where: { supabaseId: user.id },
          select: { clearance: true },
        });
        userClearance = profile?.clearance ?? null;
      }
    }
  } catch {
    // Non-critical — proceed as anonymous
  }

  // --- Per-user daily cap ---------------------------------------------------
  if (userId) {
    const limitCheck = await checkDailyBattleLimit(userId, userClearance);

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "daily_battle_limit_exceeded",
          limit: limitCheck.limit,
          used: limitCheck.used,
          retryAfter: limitCheck.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limitCheck.retryAfterSeconds ?? 0),
          },
        },
      );
    }
  }

  // --- Cache-first lookup ---------------------------------------------------
  if (!forceRefresh) {
    const cacheKey = buildBattleCacheKey(fighterA, fighterB, options);
    const cached = await findCachedBattleResult(cacheKey);

    if (cached) {
      // Create a history record for the current user even on cache hit
      if (userId) {
        const battleRun = await createBattleRunRecord({
          fighterA,
          fighterB,
          options,
          userId,
        });
        await completeBattleRunRecord(battleRun, {
          result: cached.result,
          generation: cached.generation,
        });
      }

      const result = orientBattleResultForRequest(
        cached.result,
        fighterA,
        fighterB,
      );

      const quality = computeBattleQualityScore(result);

      return NextResponse.json({
        ...result,
        generation: cached.generation,
        battle_run_id: cached.battleRunId,
        cached: true,
        quality_score: quality.overall,
        quality_band: quality.band,
      });
    }
  }

  // --- Fresh battle ---------------------------------------------------------
  const battleRun = await createBattleRunRecord({
    fighterA,
    fighterB,
    options,
    userId,
  });

  try {
    const { result, generation } = await runBattleAnalysisWithMetadata(
      fighterA,
      fighterB,
      options,
    );

    await completeBattleRunRecord(battleRun, { result, generation });

    const quality = computeBattleQualityScore(result);

    return NextResponse.json({
      ...result,
      generation,
      battle_run_id: battleRun?.id ?? null,
      cached: false,
      quality_score: quality.overall,
      quality_band: quality.band,
    });
  } catch (error) {
    console.error(error);
    const generation = errorGeneration(error);
    const issues = validationIssues(error);
    const message = errorMessage(error);

    await failBattleRunRecord(battleRun, {
      errorMessage: message,
      generation,
      validationIssues: issues,
    });

    return NextResponse.json(
      {
        error: message,
        ...(generation ? { generation } : {}),
        ...(issues ? { validation_issues: issues } : {}),
        battle_run_id: battleRun?.id ?? null,
      },
      { status: errorStatus(error) },
    );
  }
}
