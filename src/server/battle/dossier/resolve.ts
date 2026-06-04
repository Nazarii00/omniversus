import { hasDatabaseUrl } from "@/server/db/prisma";

import type { RunBattleAnalysisOptions } from "../domain/schema";
import { buildFighterDossier } from "./buildDossier";
import { BASE_CRITICAL_DOSSIER_CATEGORIES } from "./constants";
import {
  criticalCategoriesForSubject,
  findMissingCriticalCategories,
} from "./critical";
import { findDossierVersion, findSubject } from "./repository";
import type { DossierSide } from "./recordTypes";
import type { BattleDossierContext, FighterDossierResolution } from "./types";

function unresolvedDossier(
  fighterName: string,
  options: RunBattleAnalysisOptions,
): FighterDossierResolution {
  const canonScope = options.canonScope ?? "PRIMARY_CANON";

  return {
    status: "NOT_FOUND",
    dossier: null,
    missing_critical_categories: BASE_CRITICAL_DOSSIER_CATEGORIES,
    notes: `No curated dossier is available for ${fighterName} in ${canonScope}. The model may infer facts, but important inferred facts must be marked for review.`,
  };
}

function disabledDossier(
  fighterName: string,
  reason: string,
): FighterDossierResolution {
  return {
    status: "DISABLED",
    dossier: null,
    missing_critical_categories: BASE_CRITICAL_DOSSIER_CATEGORIES,
    notes: `Dossier lookup is disabled for ${fighterName}: ${reason}. The model may infer facts, but important inferred facts must be marked for review.`,
  };
}

async function resolveFighterDossier(
  fighterName: string,
  side: DossierSide,
  options: RunBattleAnalysisOptions,
): Promise<FighterDossierResolution> {
  const subject = await findSubject(fighterName);

  if (!subject) return unresolvedDossier(fighterName, options);

  const version = await findDossierVersion(subject.id, side, options);

  if (!version) {
    return {
      status: "PARTIAL",
      dossier: null,
      missing_critical_categories: criticalCategoriesForSubject(subject.kind),
      notes: `Matched ${subject.displayName}, but no version dossier exists for the requested scope/version.`,
    };
  }

  const dossier = buildFighterDossier(fighterName, version);
  const missingCriticalCategories = findMissingCriticalCategories(
    dossier.facts,
    version.subject.kind,
  );

  return {
    status: missingCriticalCategories.length ? "PARTIAL" : "FOUND",
    dossier,
    missing_critical_categories: missingCriticalCategories,
    notes: missingCriticalCategories.length
      ? `Database dossier found, but missing: ${missingCriticalCategories.join(", ")}.`
      : "Database dossier found with required critical categories.",
  };
}

function contextMode(
  A: FighterDossierResolution,
  B: FighterDossierResolution,
): BattleDossierContext["mode"] {
  const foundCount = [A, B].filter((resolution) => resolution.dossier).length;

  if (foundCount === 2) return "DATABASE";
  if (foundCount === 1) return "MIXED";
  return "DATABASE";
}

function buildContext(
  mode: BattleDossierContext["mode"],
  A: FighterDossierResolution,
  B: FighterDossierResolution,
): BattleDossierContext {
  return {
    mode,
    source_priority: [
      "MANUAL_DB",
      "ACCEPTED_DB",
      "RAG_RETRIEVED",
      "MODEL_INFERRED",
    ],
    missing_data_policy: "infer_with_review_flags",
    allow_model_fact_suggestions: true,
    A,
    B,
  };
}

export async function resolveBattleDossierContext(
  fighterA: string,
  fighterB: string,
  options: RunBattleAnalysisOptions = {},
): Promise<BattleDossierContext> {
  if (!hasDatabaseUrl()) {
    return buildContext(
      "DB_STUB",
      disabledDossier(fighterA, "DATABASE_URL or DIRECT_URL is not configured"),
      disabledDossier(fighterB, "DATABASE_URL or DIRECT_URL is not configured"),
    );
  }

  try {
    const [A, B] = await Promise.all([
      resolveFighterDossier(fighterA, "A", options),
      resolveFighterDossier(fighterB, "B", options),
    ]);

    return buildContext(contextMode(A, B), A, B);
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "unknown database error";

    return buildContext(
      "DB_STUB",
      disabledDossier(fighterA, reason),
      disabledDossier(fighterB, reason),
    );
  }
}
