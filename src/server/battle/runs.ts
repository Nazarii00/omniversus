import { revalidatePath } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import { BattleRunStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/server/db/prisma";

import { buildBattleCacheKey } from "./cache";
import type {
  BattleGenerationMetadata,
  OmniversusBattle,
  RunBattleAnalysisOptions,
} from "./domain/schema";
import { resolveBattleProvider } from "./providers";
import { computeBattleQualityScore } from "./quality";

export type BattleRunHandle = {
  id: string;
};

type CreateBattleRunRecordInput = {
  fighterA: string;
  fighterB: string;
  options: RunBattleAnalysisOptions;
  userId?: string | null;
};

type CompleteBattleRunRecordInput = {
  result: OmniversusBattle;
  generation: BattleGenerationMetadata;
};

type FailBattleRunRecordInput = {
  errorMessage: string;
  generation: BattleGenerationMetadata | null;
  validationIssues: unknown[] | null;
};

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function logPersistenceError(action: string, error: unknown) {
  console.error(`[BATTLE_RUNS] ${action} failed`, error);
}

function resolveRequestedGeneration(options: RunBattleAnalysisOptions) {
  const provider = resolveBattleProvider();

  return {
    provider: provider.id,
    model: provider.resolveBattleModel(options.model),
  };
}

export async function createBattleRunRecord({
  fighterA,
  fighterB,
  options,
  userId,
}: CreateBattleRunRecordInput): Promise<BattleRunHandle | null> {
  const prisma = getPrisma();
  if (!prisma) return null;

  try {
    const requestedGeneration = resolveRequestedGeneration(options);
    const cacheKey = buildBattleCacheKey(fighterA, fighterB, options);
    const run = await prisma.battleRun.create({
      data: {
        fighterAName: fighterA,
        fighterBName: fighterB,
        cacheKey,
        status: BattleRunStatus.PENDING,
        requestedModel: requestedGeneration.model,
        createdByUserId: userId ?? null,
        requestPayload: toInputJson({
          source: "api/battle",
          provider: requestedGeneration.provider,
          fighterA,
          fighterB,
          options,
        }),
      },
      select: {
        id: true,
      },
    });

    return run;
  } catch (error) {
    logPersistenceError("create", error);
    return null;
  }
}

export async function completeBattleRunRecord(
  run: BattleRunHandle | null,
  { result, generation }: CompleteBattleRunRecordInput,
) {
  if (!run) return;

  const prisma = getPrisma();
  if (!prisma) return;

  try {
    await prisma.battleRun.update({
      where: { id: run.id },
      data: {
        status: BattleRunStatus.COMPLETED,
        requestedModel: generation.requested_model,
        resolvedModel: generation.model,
        resultPayload: toInputJson({
          result,
          generation,
        }),
        qualityScore: computeBattleQualityScore(result).overall,
        qualityBand: computeBattleQualityScore(result).band,
        completedAt: new Date(),
      },
    });

    revalidatePath("/admin");
  } catch (error) {
    logPersistenceError("complete", error);
  }
}

export async function failBattleRunRecord(
  run: BattleRunHandle | null,
  { errorMessage, generation, validationIssues }: FailBattleRunRecordInput,
) {
  if (!run) return;

  const prisma = getPrisma();
  if (!prisma) return;

  try {
    const requestedGeneration = resolveRequestedGeneration({});
    await prisma.battleRun.update({
      where: { id: run.id },
      data: {
        status: BattleRunStatus.FAILED,
        requestedModel:
          generation?.requested_model ?? requestedGeneration.model,
        resolvedModel: generation?.model ?? null,
        errorMessage,
        resultPayload: toInputJson({
          error: errorMessage,
          generation,
          validation_issues: validationIssues,
        }),
        completedAt: new Date(),
      },
    });

    revalidatePath("/admin");
  } catch (error) {
    logPersistenceError("fail", error);
  }
}
