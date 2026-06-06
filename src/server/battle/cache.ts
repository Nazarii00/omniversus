
import { BattleRunStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/server/db/prisma";

import type {
  BattleGenerationMetadata,
  OmniversusBattle,
  RunBattleAnalysisOptions,
} from "./domain/schema";

/**
 * Cached battle result pulled from a completed BattleRun.
 */
export type CachedBattleResult = {
  battleRunId: string;
  result: OmniversusBattle;
  generation: BattleGenerationMetadata;
};

// ---------------------------------------------------------------------------
// Cache key
// ---------------------------------------------------------------------------

/**
 * Normalise a fighter name for cache-key purposes.
 * Trims whitespace, collapses inner runs of whitespace to a single space,
 * and lowercases.
 */
function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Build a deterministic, order-independent key from two fighter names and the
 * battle options that semantically affect the outcome.
 *
 * The key format is:
 *   `<nameMin>||<nameMax>||<optionsJson>`
 *
 * Fighter names are sorted lexicographically so that A-vs-B produces the same
 * key as B-vs-A. Version overrides are attached to their respective fighter
 * before sorting.
 */
export function buildBattleCacheKey(
  fighterA: string,
  fighterB: string,
  options: RunBattleAnalysisOptions = {},
): string {
  const versionA = options.characterAVersion?.trim().toLowerCase() ?? "";
  const versionB = options.characterBVersion?.trim().toLowerCase() ?? "";

  // Pair each fighter with its version, then sort by name so order is stable.
  let pairA = { name: normalizeName(fighterA), version: versionA };
  let pairB = { name: normalizeName(fighterB), version: versionB };

  if (pairA.name > pairB.name) {
    [pairA, pairB] = [pairB, pairA];
  }

  // Only options that change the *battle semantics* participate in the key.
  // Generation-level params (model, temperature, thinkingLevel…) are excluded.
  const semanticOptions: Record<string, unknown> = {};

  if (options.canonScope) semanticOptions.cs = options.canonScope;
  if (options.speedEqualized) semanticOptions.se = true;
  if (options.battleTypeHint) semanticOptions.bt = options.battleTypeHint;
  if (options.location) semanticOptions.loc = options.location;
  if (options.startingDistance) semanticOptions.sd = options.startingDistance;
  if (options.prepTime) semanticOptions.pt = options.prepTime;
  if (options.priorKnowledge) semanticOptions.pk = options.priorKnowledge;
  if (options.equipmentRules) semanticOptions.eq = options.equipmentRules;
  if (options.verseEqualization) semanticOptions.ve = options.verseEqualization;
  if (options.outputLanguage) semanticOptions.lang = options.outputLanguage;
  if (options.customRules && options.customRules.length > 0) {
    semanticOptions.cr = [...options.customRules].sort();
  }

  // Versions are attached via the sorted pair, not as a separate option.
  const namePart = pairA.version
    ? `${pairA.name}@${pairA.version}`
    : pairA.name;
  const namePartB = pairB.version
    ? `${pairB.name}@${pairB.version}`
    : pairB.name;

  const optionsPart =
    Object.keys(semanticOptions).length > 0
      ? JSON.stringify(semanticOptions, Object.keys(semanticOptions).sort())
      : "";

  return optionsPart
    ? `${namePart}||${namePartB}||${optionsPart}`
    : `${namePart}||${namePartB}`;
}

// ---------------------------------------------------------------------------
// Cache lookup
// ---------------------------------------------------------------------------

/**
 * Search for the most recent COMPLETED BattleRun that matches the cache key.
 * Returns the parsed result + generation metadata, or `null` on cache miss.
 */
export async function findCachedBattleResult(
  cacheKey: string,
): Promise<CachedBattleResult | null> {
  const prisma = getPrisma();
  if (!prisma) return null;

  try {
    const run = await prisma.battleRun.findFirst({
      where: {
        cacheKey,
        status: BattleRunStatus.COMPLETED,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        resultPayload: true,
      },
    });

    if (!run || !run.resultPayload) return null;

    const payload = run.resultPayload as {
      result?: unknown;
      generation?: unknown;
    };

    if (!payload.result || !payload.generation) return null;

    return {
      battleRunId: run.id,
      result: payload.result as OmniversusBattle,
      generation: payload.generation as BattleGenerationMetadata,
    };
  } catch (error) {
    console.error("[BATTLE_CACHE] lookup failed", error);
    return null;
  }
}
