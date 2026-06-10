import { NextRequest, NextResponse } from "next/server";

import { BattleRunStatus } from "@/generated/prisma/enums";
import {
  BattleAnalysisError,
  computeBattleQualityScore,
  runBattleAnalysisWithMetadata,
  type RunBattleAnalysisOptions,
} from "@/server/battle";
import { getPrisma } from "@/server/db/prisma";
import { createServerSupabaseClient } from "@/server/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function toInputJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null));
}

export async function POST(request: NextRequest) {
  // Auth check
  let userId: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    userId = data.user.id;
  } catch {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 },
    );
  }

  // Admin check
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 500 },
    );
  }

  const profile = await prisma.profile.findUnique({
    where: { supabaseId: userId },
    select: { clearance: true },
  });

  const isAdmin = profile?.clearance?.startsWith("SIGMA-5") ?? false;
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const battleRunId =
    typeof body.battleRunId === "string" ? body.battleRunId : "";
  if (!battleRunId) {
    return NextResponse.json(
      { error: "battleRunId is required" },
      { status: 400 },
    );
  }

  // Fetch existing run
  const existingRun = await prisma.battleRun.findUnique({
    where: { id: battleRunId },
    select: {
      id: true,
      fighterAName: true,
      fighterBName: true,
      requestPayload: true,
    },
  });

  if (!existingRun) {
    return NextResponse.json(
      { error: "Battle run not found" },
      { status: 404 },
    );
  }

  // Extract original options
  const payload = existingRun.requestPayload as Record<string, unknown> | null;
  const options = (payload?.options as RunBattleAnalysisOptions) ?? {};

  // Regenerate
  try {
    const { result, generation } = await runBattleAnalysisWithMetadata(
      existingRun.fighterAName,
      existingRun.fighterBName,
      options,
    );

    const quality = computeBattleQualityScore(result);

    await prisma.battleRun.update({
      where: { id: existingRun.id },
      data: {
        status: BattleRunStatus.COMPLETED,
        requestedModel: generation.requested_model,
        resolvedModel: generation.model,
        resultPayload: toInputJson({ result, generation }),
        qualityScore: quality.overall,
        qualityBand: quality.band,
        errorMessage: null,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      battleRunId: existingRun.id,
      result,
      generation,
      quality_score: quality.overall,
      quality_band: quality.band,
    });
  } catch (error) {
    console.error("[regenerate-battle] error", error);

    const gen = error instanceof BattleAnalysisError ? error.generation : null;
    const issues =
      error instanceof BattleAnalysisError ? error.validationIssues : null;
    const msg =
      error instanceof Error ? error.message : "Battle regeneration failed";
    const status = (() => {
      if (error instanceof BattleAnalysisError) return error.status;
      return 502;
    })();

    await prisma.battleRun
      .update({
        where: { id: existingRun.id },
        data: {
          status: BattleRunStatus.FAILED,
          requestedModel: gen?.requested_model ?? null,
          resolvedModel: gen?.model ?? null,
          errorMessage: msg,
          resultPayload: toInputJson({
            error: msg,
            generation: gen,
            validation_issues: issues,
          }),
          completedAt: new Date(),
        },
      })
      .catch(() => {
        /* non-critical */
      });

    return NextResponse.json(
      {
        error: msg,
        ...(gen ? { generation: gen } : {}),
        ...(issues ? { validation_issues: issues } : {}),
        battleRunId: existingRun.id,
      },
      { status },
    );
  }
}
