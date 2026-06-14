import { NextRequest, NextResponse } from "next/server";

import {
  BattleAnalysisError,
  computeBattleQualityScore,
  orientBattleResultForRequest,
  runBattleAnalysisWithMetadata,
  type RunBattleAnalysisOptions,
} from "@/server/battle";
import { createServerSupabaseClient } from "@/server/supabase/server";
import { getPrisma } from "@/server/db/prisma";

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
  // --- Auth check ------------------------------------------------------------
  let userId: string | null = null;
  let userClearance: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    userId = user.id;

    const prisma = getPrisma();
    if (prisma) {
      const profile = await prisma.profile.findUnique({
        where: { supabaseId: user.id },
        select: { clearance: true },
      });
      userClearance = profile?.clearance ?? null;
    }
  } catch {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 },
    );
  }

  // --- SIGMA-5 clearance check -----------------------------------------------
  const isAdmin = userClearance?.startsWith("SIGMA-5") ?? false;
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Developer mode requires SIGMA-5 clearance" },
      { status: 403 },
    );
  }

  // --- Parse body ------------------------------------------------------------
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

  // --- Dev battle (no DB, no cache, no limits) -------------------------------
  try {
    const { result, generation } = await runBattleAnalysisWithMetadata(
      fighterA,
      fighterB,
      { ...options, devMode: true },
    );

    const orientedResult = orientBattleResultForRequest(
      result,
      fighterA,
      fighterB,
    );

    const quality = computeBattleQualityScore(result);

    return NextResponse.json({
      ...orientedResult,
      generation,
      cached: false,
      dev_mode: true,
      quality_score: quality.overall,
      quality_band: quality.band,
    });
  } catch (error) {
    console.error("[dev-battle] error", error);
    const generation = errorGeneration(error);
    const issues = validationIssues(error);
    const message = errorMessage(error);

    return NextResponse.json(
      {
        error: message,
        ...(generation ? { generation } : {}),
        ...(issues ? { validation_issues: issues } : {}),
        dev_mode: true,
      },
      { status: errorStatus(error) },
    );
  }
}
