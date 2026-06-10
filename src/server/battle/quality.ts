import type { OmniversusBattle } from "./domain/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QualityBand = "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "UNRELIABLE";

export type QualityMetric = {
  score: number; // 0-100
  weight: number; // 0-1
  label: string;
  detail: string;
};

export type BattleQualityReport = {
  overall: number; // 0-100
  band: QualityBand;
  metrics: Record<string, QualityMetric>;
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Band resolution
// ---------------------------------------------------------------------------

function resolveBand(score: number): QualityBand {
  if (score >= 85) return "EXCELLENT";
  if (score >= 70) return "GOOD";
  if (score >= 50) return "FAIR";
  if (score >= 30) return "POOR";
  return "UNRELIABLE";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isVerifiedPrimaryClaim(
  claim: OmniversusBattle["claims"][number],
): boolean {
  return (
    claim.source.status === "VERIFIED" &&
    claim.source.reliability === "PRIMARY" &&
    !isGenericSourceRef(claim.source.ref)
  );
}

function isGenericSourceRef(ref: string): boolean {
  const normalized = ref.trim().toLowerCase();
  if (!normalized || normalized.length < 10) return true;

  const weakExact = new Set([
    "source requires verification",
    "wiki",
    "unknown",
    "n/a",
  ]);
  if (weakExact.has(normalized)) return true;

  const weakPatterns = [
    "requires verification",
    "wiki",
    "speed chart",
    "verse feats",
    "manga/anime",
    "various",
    "general",
    "consensus",
    "profile",
    "arc",
  ];
  return weakPatterns.some((p) => normalized.includes(p));
}

function decisiveChain(
  battle: OmniversusBattle,
): OmniversusBattle["argument_chains"][number] | undefined {
  const chainById = new Map(battle.argument_chains.map((c) => [c.id, c]));
  const decisiveId = battle.verdict.decisive_chain_id;
  if (decisiveId && chainById.has(decisiveId)) {
    return chainById.get(decisiveId);
  }
  // Fallback: winner-side WIN_CONDITION chain
  return battle.argument_chains.find(
    (c) =>
      c.chain_type === "WIN_CONDITION" && c.side === battle.verdict.winner_side,
  );
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

function metricVerifiedClaimsRatio(
  battle: OmniversusBattle,
): Omit<QualityMetric, "weight"> {
  const total = battle.claims.length;
  const verified = battle.claims.filter(isVerifiedPrimaryClaim).length;
  const score = total > 0 ? Math.round((verified / total) * 100) : 0;

  return {
    score,
    label: "Verified Claims",
    detail: `${verified}/${total} claims have verified primary sources`,
  };
}

function metricDecisiveChainStrength(
  battle: OmniversusBattle,
): Omit<QualityMetric, "weight"> {
  const chain = decisiveChain(battle);

  if (!chain) {
    return {
      score: 30,
      label: "Decisive Chain",
      detail: "No decisive chain identified",
    };
  }

  let penalty = 0;
  const issues: string[] = [];

  if (chain.contested) {
    penalty += 25;
    issues.push("chain is contested");
  }

  for (const premise of chain.premises) {
    if (premise.contested) {
      penalty += 20;
      issues.push(`premise "${premise.id}" is contested`);
    }
    if (premise.claim_id === "N_A") {
      penalty += 15;
      issues.push(`premise "${premise.id}" has no linked claim`);
    }
  }

  const score = Math.max(0, 100 - penalty);
  return {
    score,
    label: "Decisive Chain",
    detail:
      issues.length > 0
        ? `Issues: ${issues.join("; ")}`
        : "Decisive chain is clean",
  };
}

function metricClaimDiversity(
  battle: OmniversusBattle,
): Omit<QualityMetric, "weight"> {
  const coreCategories = [
    "AP",
    "DURABILITY",
    "SPEED",
    "STAMINA",
    "SKILL",
    "ABILITY",
    "RESISTANCE",
    "WEAKNESS",
    "RANGE",
    "INTELLIGENCE",
  ] as const;

  const present = new Set(battle.claims.map((c) => c.category));
  const covered = coreCategories.filter((cat) => present.has(cat));
  const score = Math.round((covered.length / coreCategories.length) * 100);

  return {
    score,
    label: "Claim Diversity",
    detail: `${covered.length}/${coreCategories.length} categories: ${covered.join(", ")}`,
  };
}

function metricDataProvenance(
  battle: OmniversusBattle,
): Omit<QualityMetric, "weight"> {
  // Infer dossier availability from data_provenance.mode and quality flags
  const mode = battle.data_provenance.mode;
  const hasDossier =
    mode === "MANUAL" ||
    (mode !== "MODEL_INFERRED" && !battle.quality_flags.has_data_input_warning);

  // Count fighters with non-Unknown profiles
  const fighterWithData = battle.fighters.filter(
    (f) =>
      f.profile.ap !== "Unknown" ||
      f.profile.speed !== "Unknown" ||
      f.profile.durability !== "Unknown",
  ).length;

  if (fighterWithData === 2 && hasDossier) {
    return {
      score: 100,
      label: "Data Provenance",
      detail: "Both fighters have database-backed data",
    };
  }
  if (fighterWithData === 1) {
    return {
      score: 55,
      label: "Data Provenance",
      detail: "One fighter has data, one is model-inferred",
    };
  }
  return {
    score: 15,
    label: "Data Provenance",
    detail: "Both fighters are model-inferred",
  };
}

function metricConfidenceConsistency(
  battle: OmniversusBattle,
): Omit<QualityMetric, "weight"> {
  const scores = [
    battle.verdict.confidence_score,
    battle.verdict.data_confidence_score,
    battle.verdict.verdict_confidence_given_data_score,
    battle.verdict.verdict_confidence_robustness_score,
  ].filter((s) => typeof s === "number" && s > 0);

  if (scores.length < 2) {
    return {
      score: 50,
      label: "Confidence Consistency",
      detail: "Not enough confidence scores to compare",
    };
  }

  const maxGap = Math.max(...scores) - Math.min(...scores);
  const score = Math.max(0, 100 - maxGap * 2);

  return {
    score,
    label: "Confidence Consistency",
    detail:
      maxGap > 20
        ? `Large gap (${maxGap}) between confidence scores`
        : maxGap > 10
          ? `Moderate gap (${maxGap}) between confidence scores`
          : "Confidence scores are consistent",
  };
}

function metricNarrativeHpMonotonic(
  battle: OmniversusBattle,
): Omit<QualityMetric, "weight"> {
  if (battle.narrative.length < 2) {
    return {
      score: 100,
      label: "Narrative HP Flow",
      detail: "Not enough steps to evaluate",
    };
  }

  const steps = battle.narrative;
  const lastStep = steps[steps.length - 1];
  const firstStep = steps[0];

  // Simple check: total HP drop across narrative should be consistent
  // with the verdict outcome
  const aHpLoss = firstStep.a_hp - lastStep.a_hp;
  const bHpLoss = firstStep.b_hp - lastStep.b_hp;

  if (
    battle.verdict.winner_side === "DRAW" ||
    battle.verdict.winner_side === "INCONCLUSIVE"
  ) {
    // Both should have comparable HP loss
    const gap = Math.abs(aHpLoss - bHpLoss);
    return {
      score: Math.max(0, 100 - gap * 2),
      label: "Narrative HP Flow",
      detail:
        gap > 30
          ? `HP gap (${gap}) inconsistent with draw/inconclusive verdict`
          : "HP flow is consistent with verdict",
    };
  }

  const winner = battle.fighters.find(
    (f) => f.side === battle.verdict.winner_side,
  );
  const loserSide = battle.verdict.winner_side === "A" ? "B" : "A";

  const winnerHpLoss = winner?.side === "A" ? aHpLoss : bHpLoss;
  const loserHpLoss = loserSide === "A" ? aHpLoss : bHpLoss;

  // Winner should have less HP loss (or more HP remaining)
  if (loserHpLoss >= winnerHpLoss) {
    return {
      score: 100,
      label: "Narrative HP Flow",
      detail: "HP flow is consistent with verdict outcome",
    };
  }

  // Winner lost more HP than loser — suspicious
  return {
    score: 50,
    label: "Narrative HP Flow",
    detail: "Winner lost more HP than loser — may need review",
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const METRICS = {
  VERIFIED_CLAIMS_RATIO: { fn: metricVerifiedClaimsRatio, weight: 0.25 },
  DECISIVE_CHAIN_STRENGTH: { fn: metricDecisiveChainStrength, weight: 0.25 },
  CLAIM_DIVERSITY: { fn: metricClaimDiversity, weight: 0.15 },
  DATA_PROVENANCE: { fn: metricDataProvenance, weight: 0.2 },
  CONFIDENCE_CONSISTENCY: { fn: metricConfidenceConsistency, weight: 0.1 },
  NARRATIVE_HP_MONOTONIC: { fn: metricNarrativeHpMonotonic, weight: 0.05 },
} as const;

export function computeBattleQualityScore(
  battle: OmniversusBattle,
): BattleQualityReport {
  const metrics: Record<string, QualityMetric> = {};
  const warnings: string[] = [];
  let overall = 0;

  for (const [key, { fn, weight }] of Object.entries(METRICS)) {
    const { score, label, detail } = fn(battle);
    metrics[key] = { score, weight, label, detail };
    overall += score * weight;

    if (score < 40) {
      warnings.push(`${label}: ${detail}`);
    }
  }

  const rounded = Math.round(overall);

  return {
    overall: rounded,
    band: resolveBand(rounded),
    metrics,
    warnings,
  };
}
