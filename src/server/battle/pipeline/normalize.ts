import type { OmniversusBattle } from "../domain/schema";

function clampConfidenceBand(
  score: number,
): OmniversusBattle["verdict"]["confidence_band"] {
  if (score >= 80) return "DOMINANT_80_100";
  if (score >= 65) return "CONFIDENT_65_79";
  if (score >= 50) return "CONTESTED_50_64";
  return "INDETERMINATE_1_49";
}

function isWeakAppealNeeded(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length < 12 ||
    ["true", "false", "yes", "no", "none"].includes(normalized)
  );
}

function looksLikeAbilityWinCondition(value: string): boolean {
  const text = value.toLowerCase();

  return [
    "seal",
    "sealing",
    "domain",
    "contract",
    "mind",
    "soul",
    "bfr",
    "banish",
    "drain",
    "life force",
    "passive",
    "concept",
    "conceptual",
    "causality",
    "time stop",
    "space",
    "void",
    "infinity",
    "curse",
  ].some((keyword) => text.includes(keyword));
}

function isGenericSourceRef(ref: string): boolean {
  const normalized = ref.trim().toLowerCase();

  if (!normalized || normalized.length < 10) return true;

  const weakExactRefs = new Set([
    "source requires verification",
    "vsbw speed chart",
    "wiki",
    "unknown",
    "n/a",
  ]);

  if (weakExactRefs.has(normalized)) return true;

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

  return weakPatterns.some((pattern) => normalized.includes(pattern));
}

const SPEED_TEXT_PATTERN =
  /speed|faster|blitz|reaction|mftl|ftl|lightspeed|supersonic|hypersonic/i;
const DURABILITY_TEXT_PATTERN = /durability|tank|survive|defense/i;
const ABILITY_TEXT_PATTERN =
  /ability|hax|drain|seal|bfr|dodge|contact|passive|mind|soul|time|space|concept|causal/i;
const HP_RECOVERY_TEXT_PATTERN =
  /regenerat|regen\b|healing?\b|heal\b|self[-\s]?repair|reconstitut|restore(?:s|d|ing)?|rebuild|rapid recovery/i;
const AP_TEXT_PATTERN =
  /ap|attack potency|tier|power|force|damage|destructive|universal|multiversal|star|planet|moon|city|mountain|cosmo/i;

function isWeakSource(claim: OmniversusBattle["claims"][number]): boolean {
  if (
    claim.source.status === "REQUIRES_VERIFICATION" ||
    claim.source.status === "CONTESTED" ||
    claim.source.status === "REJECTED"
  ) {
    return true;
  }

  if (
    claim.source.type === "UNKNOWN" ||
    claim.source.reliability === "UNKNOWN"
  ) {
    return true;
  }

  if (isGenericSourceRef(claim.source.ref)) {
    return true;
  }

  if (
    claim.source.status === "VERIFIED" &&
    claim.source.reliability !== "PRIMARY"
  ) {
    return true;
  }

  return false;
}

function isExactPrimarySource(
  source: OmniversusBattle["claims"][number]["source"],
): boolean {
  return (
    source.status === "VERIFIED" &&
    source.reliability === "PRIMARY" &&
    !isGenericSourceRef(source.ref)
  );
}

function chainHasGap(
  chain: OmniversusBattle["argument_chains"][number],
): boolean {
  return (
    chain.contested ||
    chain.premises.some(
      (premise) => premise.contested || premise.claim_id === "N_A",
    )
  );
}

function isDecisiveOrWinnerChain(
  chain: OmniversusBattle["argument_chains"][number],
  result: OmniversusBattle,
): boolean {
  return (
    chain.id === result.verdict.decisive_chain_id ||
    chain.side === result.verdict.winner_side
  );
}

function normalizeClaimTagForKind(
  kind: OmniversusBattle["claims"][number]["kind"],
  tag: OmniversusBattle["claims"][number]["tag"],
): OmniversusBattle["claims"][number]["tag"] {
  if (kind === "SCALING") return "SCALING";
  if (kind === "CALC") return "CALC";
  if (kind === "STATEMENT") return "STATEMENT";
  if (kind === "ANTI_FEAT") return "ANTI_FEAT";
  if (kind === "DIRECT_FEAT") return tag === "SCALING" ? "DIRECT" : tag;
  return tag;
}

function normalizeClaimKindForTag(
  claim: OmniversusBattle["claims"][number],
): OmniversusBattle["claims"][number]["kind"] {
  if (claim.tag === "CALC") return "CALC";
  if (
    claim.tag === "SCALING" &&
    !(claim.kind === "DIRECT_FEAT" && isExactPrimarySource(claim.source))
  ) {
    return "SCALING";
  }

  return claim.kind;
}

function isWeakRecommendedRematch(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ["", "none", "n/a", "na", "not required", "not recommended"].includes(
    normalized,
  );
}

function buildRecommendedRematch(result: OmniversusBattle): string {
  if (
    result.verdict.winner_side === "DRAW" ||
    result.verdict.winner_side === "INCONCLUSIVE"
  ) {
    return "";
  }

  const winner = result.fighters.find(
    (fighter) => fighter.side === result.verdict.winner_side,
  );
  const loserSide = result.verdict.winner_side === "A" ? "B" : "A";
  const loser = result.fighters.find((fighter) => fighter.side === loserSide);

  if (!winner || !loser) return "";

  return `${loser.name} vs an opponent closer to ${winner.name}'s tier, speed, resistance profile, or win-condition access.`;
}

function normalizeRecommendedRematch(
  result: OmniversusBattle,
): OmniversusBattle {
  if (!isWeakRecommendedRematch(result.verdict.recommended_rematch)) {
    return result;
  }

  return {
    ...result,
    verdict: {
      ...result.verdict,
      recommended_rematch: buildRecommendedRematch(result),
    },
  };
}

function normalizeAppealNeeded(
  appeal: OmniversusBattle["appeals"][number],
): OmniversusBattle["appeals"][number] {
  return {
    ...appeal,
    needed: isWeakAppealNeeded(appeal.needed)
      ? "Provide exact primary references, accepted profile sections, or accepted calculations for the targeted claims."
      : appeal.needed,
  };
}

function uniqueStrings(values: string[], maxItems: number): string[] {
  return Array.from(new Set(values.filter(Boolean))).slice(0, maxItems);
}

function orderBattleResult(result: OmniversusBattle): OmniversusBattle {
  return {
    metadata: result.metadata,
    data_provenance: result.data_provenance,
    rules: result.rules,
    stat_model: result.stat_model,
    fighters: result.fighters,
    tier_sanitization: result.tier_sanitization,
    claims: result.claims,
    argument_chains: result.argument_chains,
    comparison: result.comparison,
    ability_interactions: result.ability_interactions,
    win_conditions: result.win_conditions,
    audit: result.audit,
    quality_flags: result.quality_flags,
    narrative: result.narrative,
    verdict: result.verdict,
    appeals: result.appeals,
    ui: result.ui,
  };
}

function normalizeMetadataRuleConsistency(
  result: OmniversusBattle,
): OmniversusBattle {
  return {
    ...result,
    rules: {
      ...result.rules,
      speed_equalized: result.metadata.speed_equalized,
    },
  };
}

function scoreFingerprint(seed: string): number {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function scoreBandFloor(score: number): number {
  if (score >= 80) return 80;
  if (score >= 65) return 65;
  if (score >= 50) return 50;
  return 1;
}

function scoreBandCeiling(score: number): number {
  if (score >= 80) return 100;
  if (score >= 65) return 79;
  if (score >= 50) return 64;
  return 49;
}

function isCoarsePercentageScore(score: number): boolean {
  return score > 1 && score < 100 && score % 5 === 0;
}

function refinePercentageScore(
  score: number,
  seed: string,
  options: {
    maxScore?: number;
    minScore?: number;
    preserveBand?: boolean;
  } = {},
): number {
  const minScore = options.minScore ?? 1;
  const maxScore = options.maxScore ?? 100;
  const preserveBand = options.preserveBand ?? true;
  const value = Math.max(minScore, Math.min(maxScore, Math.round(score)));

  if (!isCoarsePercentageScore(value)) return value;

  const lowerBound = Math.max(
    minScore,
    preserveBand ? scoreBandFloor(value) : minScore,
  );
  const upperBound = Math.min(
    maxScore,
    preserveBand ? scoreBandCeiling(value) : maxScore,
  );

  if (lowerBound >= upperBound) return value;

  const hash = scoreFingerprint(seed);
  const offset = (hash % 3) + 1;
  const preferDown = hash % 2 === 0;
  const candidates = preferDown
    ? [value - offset, value + offset, value - 1, value + 1]
    : [value + offset, value - offset, value + 1, value - 1];

  return (
    candidates.find(
      (candidate) =>
        candidate >= lowerBound &&
        candidate <= upperBound &&
        candidate !== value &&
        !isCoarsePercentageScore(candidate),
    ) ?? value
  );
}

function varyPercentageScore(score: number, seed: string, radius = 3): number {
  const spread = radius * 2 + 1;
  const adjustment = (scoreFingerprint(seed) % spread) - radius;

  return refinePercentageScore(score + adjustment, seed);
}

function blendPercentageScores(
  primaryScore: number,
  secondaryScore: number,
  primaryWeight: number,
  seed: string,
): number {
  const blended =
    primaryScore * primaryWeight + secondaryScore * (1 - primaryWeight);

  return refinePercentageScore(blended, seed);
}

function confidenceScoreSeed(result: OmniversusBattle, reason: string): string {
  return [
    result.metadata.title,
    result.verdict.winner_side,
    result.verdict.difficulty,
    result.verdict.decisive_chain_id,
    result.quality_flags.most_fragile_assumption,
    reason,
  ].join("|");
}

function confidenceCapReason(current: string, fallback: string): string {
  const trimmed = current.trim();
  if (trimmed && trimmed !== "No confidence cap applied.") return trimmed;

  return fallback;
}

export function capConfidence(
  result: OmniversusBattle,
  maxScore: number,
  reason: string,
): OmniversusBattle {
  if (result.verdict.confidence_score <= maxScore) {
    return result;
  }

  const cappedScore = capScore(
    result.verdict.confidence_score,
    maxScore,
    confidenceScoreSeed(result, reason),
  );
  const riskFactors =
    result.verdict.risk_factors.length === 1 &&
    result.verdict.risk_factors[0].toLowerCase() === "none"
      ? [reason]
      : uniqueStrings([...result.verdict.risk_factors, reason], 5);

  return {
    ...result,
    verdict: {
      ...result.verdict,
      confidence_score: cappedScore,
      confidence_band: clampConfidenceBand(cappedScore),
      risk_factors: riskFactors,
    },
    quality_flags: {
      ...result.quality_flags,
      has_confidence_cap: true,
      confidence_cap_reason: confidenceCapReason(
        result.quality_flags.confidence_cap_reason,
        reason,
      ),
    },
  };
}

export function buildAutoAppeals(
  result: OmniversusBattle,
): OmniversusBattle["appeals"] {
  const appeals: OmniversusBattle["appeals"] = [];

  const dataInputNeedsReview =
    result.data_provenance.mode === "EXTRACTED_FANDOM" ||
    result.data_provenance.mode === "EXTRACTED_VSBW" ||
    result.data_provenance.mode === "MIXED" ||
    result.data_provenance.mode === "MODEL_INFERRED" ||
    result.data_provenance.mode === "UNKNOWN" ||
    result.quality_flags.has_data_input_warning;

  if (dataInputNeedsReview) {
    appeals.push({
      reason: "DATA_INPUT_ERROR",
      target_ids: result.claims
        .filter((claim) => claim.category === "DATA_QUALITY")
        .map((claim) => claim.id)
        .slice(0, 4),
      summary:
        "The report depends on extracted, inferred, mixed, or otherwise non-manual character data.",
      needed:
        "Confirm the character versions, tier ratings, abilities, resistances, and origin fields against the intended source pages.",
    });
  }

  const weakDecisiveClaims = result.claims.filter(
    (claim) =>
      claim.importance === "DECISIVE" &&
      claim.supports_verdict &&
      isWeakSource(claim),
  );

  if (weakDecisiveClaims.length > 0) {
    appeals.push({
      reason: "WRONG_SOURCE",
      target_ids: weakDecisiveClaims.map((claim) => claim.id).slice(0, 4),
      summary:
        "A decisive claim relies on a broad, vague, secondary, or verification-needed source.",
      needed:
        "Provide an exact primary reference, accepted calc, or accepted profile section for the decisive claim.",
    });
  }

  const contestedScalingClaims = result.claims.filter(
    (claim) =>
      (claim.kind === "SCALING" || claim.kind === "CALC") &&
      (claim.contested ||
        claim.review_flag === "BAD_SCALING_RISK" ||
        claim.review_flag === "CALC_DISPUTE"),
  );

  if (contestedScalingClaims.length > 0) {
    appeals.push({
      reason: contestedScalingClaims.some((claim) => claim.kind === "CALC")
        ? "CALC_DISPUTE"
        : "BAD_SCALING",
      target_ids: contestedScalingClaims.map((claim) => claim.id).slice(0, 4),
      summary:
        "A scaling or calculation claim may change the verdict if its interpretation is rejected.",
      needed:
        "Show the accepted scaling chain, calc method, or canon statement that supports the rating.",
    });
  }

  const abilityMismatch = result.ability_interactions.filter(
    (row) => row.contested || row.effective === "UNCLEAR",
  );
  const abilityTargetIds = uniqueStrings(
    abilityMismatch.flatMap((row) => [
      ...row.claim_ids,
      ...row.chain_ids,
      row.id,
    ]),
    4,
  );

  if (abilityMismatch.length > 0 && abilityTargetIds.length > 0) {
    appeals.push({
      reason: "MECHANICS_MISMATCH",
      target_ids: abilityTargetIds,
      summary:
        "An ability interaction is conditional, undeliverable, resisted, or mechanically uncertain.",
      needed:
        "Provide a canon precedent for the ability working, failing, being resisted, or bypassing the relevant counter.",
    });
  }

  const chainGapIds = result.argument_chains
    .filter(
      (chain) => isDecisiveOrWinnerChain(chain, result) && chainHasGap(chain),
    )
    .map((chain) => chain.id)
    .slice(0, 4);

  if (chainGapIds.length > 0) {
    appeals.push({
      reason: "CHAIN_GAP",
      target_ids: chainGapIds,
      summary:
        "A logical chain has a contested premise, rule-only premise, or inference that could be challenged.",
      needed:
        "Provide stronger claims for the premises or explain why the inference still follows.",
    });
  }

  return appeals.slice(0, 5);
}

function normalizeAbilityWinConditionTypes(
  result: OmniversusBattle,
): OmniversusBattle {
  return {
    ...result,
    win_conditions: result.win_conditions.map((item) => {
      const text = `${item.method} ${item.requires} ${item.blocked_by}`;

      if (!looksLikeAbilityWinCondition(text)) {
        return item;
      }

      return {
        ...item,
        type: /bfr|banish/i.test(text) ? "BFR" : "ABILITY",
      };
    }),
  };
}

function normalizeClaimTrust(result: OmniversusBattle): OmniversusBattle {
  return {
    ...result,
    claims: result.claims.map((claim) => {
      const normalizedKind = normalizeClaimKindForTag(claim);
      const normalizedTag = normalizeClaimTagForKind(normalizedKind, claim.tag);
      const weakEvidence =
        claim.evidence_level === "UNKNOWN" ||
        claim.source.type === "CONSENSUS" ||
        claim.source.type === "UNKNOWN" ||
        claim.source.reliability !== "PRIMARY" ||
        isGenericSourceRef(claim.source.ref) ||
        isWeakSource(claim);
      const weakScaling =
        weakEvidence &&
        (normalizedKind === "SCALING" ||
          normalizedKind === "CALC" ||
          normalizedTag === "SCALING" ||
          normalizedTag === "CALC");
      const weakDecisiveClaim = weakEvidence && claim.importance === "DECISIVE";

      if (!weakEvidence) {
        return {
          ...claim,
          kind: normalizedKind,
          tag: normalizedTag,
        };
      }

      return {
        ...claim,
        kind: normalizedKind,
        tag: normalizedTag,
        confidence: capScore(
          claim.confidence,
          75,
          `${claim.id}|${claim.text}|weak-evidence`,
        ),
        review_flag:
          weakScaling &&
          (claim.review_flag === "OK" || claim.review_flag === "NEEDS_SOURCE")
            ? "BAD_SCALING_RISK"
            : claim.review_flag === "OK"
              ? "NEEDS_SOURCE"
              : claim.review_flag,
        contested: claim.contested || weakScaling || weakDecisiveClaim,
      };
    }),
  };
}

function normalizeChainConfidence(result: OmniversusBattle): OmniversusBattle {
  const weakClaimIds = new Set(
    result.claims.filter(isWeakSource).map((claim) => claim.id),
  );

  return {
    ...result,
    argument_chains: result.argument_chains.map((chain) => {
      const referencedClaimIds = new Set([
        ...chain.linked_claim_ids,
        ...chain.premises.map((premise) => premise.claim_id),
      ]);
      const hasWeakClaims = Array.from(referencedClaimIds).some((id) =>
        weakClaimIds.has(id),
      );

      if (!hasWeakClaims && !chain.contested) return chain;

      return {
        ...chain,
        confidence: capScore(
          chain.confidence,
          chain.contested ? 65 : 75,
          `${chain.id}|${chain.conclusion}|chain-confidence`,
        ),
      };
    }),
  };
}

function normalizeAuditTrust(result: OmniversusBattle): OmniversusBattle {
  const needsReview =
    result.data_provenance.needs_manual_review ||
    result.data_provenance.mode !== "MANUAL" ||
    result.quality_flags.has_unverified_sources ||
    result.quality_flags.has_data_input_warning ||
    result.claims.some(isWeakSource);

  if (!needsReview) return result;

  const optimisticAuditPattern =
    /\b(verified|confirmed|robust|high|primary|consistent|straightforward)\b/i;
  const replaceIfOptimistic = (value: string, fallback: string): string =>
    optimisticAuditPattern.test(value) ? fallback : value;

  return {
    ...result,
    audit: {
      ...result.audit,
      sources: replaceIfOptimistic(
        result.audit.sources,
        "Sources require verification.",
      ),
      data_inputs: replaceIfOptimistic(
        result.audit.data_inputs,
        "Model inferred; needs review.",
      ),
      canon: replaceIfOptimistic(
        result.audit.canon,
        "Canon scope requires review.",
      ),
      tier_ap: replaceIfOptimistic(
        result.audit.tier_ap,
        "Tier/AP scaling requires review.",
      ),
      speed: replaceIfOptimistic(
        result.audit.speed,
        "Speed scaling requires review.",
      ),
      ability_interactions: replaceIfOptimistic(
        result.audit.ability_interactions,
        "Ability mechanics require review.",
      ),
      resistances: replaceIfOptimistic(
        result.audit.resistances,
        "Resistance claims require review.",
      ),
      logical_chains: replaceIfOptimistic(
        result.audit.logical_chains,
        "Valid if linked claims hold.",
      ),
      confidence: replaceIfOptimistic(
        result.audit.confidence,
        "Capped pending source review.",
      ),
    },
  };
}

function appealKey(appeal: OmniversusBattle["appeals"][number]): string {
  return `${appeal.reason}:${[...appeal.target_ids].sort().join(",")}`;
}

function isWeakModelAppeal(
  appeal: OmniversusBattle["appeals"][number],
): boolean {
  const text = `${appeal.summary} ${appeal.needed}`.trim().toLowerCase();

  return (
    appeal.reason === "OTHER" &&
    (appeal.target_ids.length === 0 ||
      /n\/a|no further analysis needed|none|not required/.test(text))
  );
}

function mergeAutoAppeals(result: OmniversusBattle): OmniversusBattle {
  if (result.metadata.battle_type !== "OBJECTIVE") return result;

  const autoAppeals = buildAutoAppeals(result);
  const modelAppeals = result.appeals.filter(
    (appeal) => !isWeakModelAppeal(appeal),
  );
  if (autoAppeals.length === 0) {
    return modelAppeals.length === result.appeals.length
      ? result
      : {
          ...result,
          appeals: modelAppeals,
        };
  }

  const seen = new Set<string>();
  const appeals = [...autoAppeals, ...modelAppeals].filter((appeal) => {
    const key = appealKey(appeal);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    ...result,
    appeals: appeals.slice(0, 6),
  };
}

function textMentionsSpeed(result: OmniversusBattle): boolean {
  const parts = [
    result.verdict.primary_reason,
    result.verdict.summary_3_sentences,
    result.rules.rule_notes,
    ...result.comparison.map((row) => `${row.category} ${row.reason}`),
    ...result.narrative.map((step) => `${step.log} ${step.why}`),
  ];

  return SPEED_TEXT_PATTERN.test(parts.join(" "));
}

function normalizeRuleImpact(result: OmniversusBattle): OmniversusBattle {
  const speedIsVerdictRelevant =
    !result.rules.speed_equalized &&
    (result.comparison.some(
      (row) =>
        row.category === "SPEED" &&
        row.winner === result.verdict.winner_side &&
        (row.margin === "LARGE" || row.margin === "DECISIVE"),
    ) ||
      result.verdict.primary_reason.toLowerCase().includes("speed") ||
      result.ui.chain_teaser.toLowerCase().includes("speed") ||
      textMentionsSpeed(result));

  if (
    !speedIsVerdictRelevant ||
    result.rules.rule_impact === "MATCH_DECIDING"
  ) {
    return result;
  }

  return {
    ...result,
    rules: {
      ...result.rules,
      rule_impact: "MATCH_DECIDING",
      rule_notes:
        result.rules.rule_notes && result.rules.rule_notes !== "None"
          ? result.rules.rule_notes
          : "Speed is not equalized and materially affects the verdict.",
    },
  };
}

function normalizeUtilityComparisonRows(
  result: OmniversusBattle,
): OmniversusBattle {
  return {
    ...result,
    comparison: result.comparison.map((row) => {
      const reason = row.reason.toLowerCase();
      const winnerHasWeakRoute =
        (row.winner === "A" || row.winner === "B") &&
        result.win_conditions.some(
          (win) =>
            win.side === row.winner &&
            (win.probability === "VERY_LOW" || win.probability === "LOW"),
        );

      if (
        row.category !== "WIN_CONDITION" ||
        row.winner === result.verdict.winner_side ||
        !winnerHasWeakRoute ||
        !/utility|jutsu|clone|versatility|tools|options/.test(reason)
      ) {
        return row;
      }

      return {
        ...row,
        category: "ABILITY",
        contested: true,
        margin: row.margin === "DECISIVE" ? "MEDIUM" : row.margin,
        reason: `${row.reason} This is treated as an ability/utility edge, not a reliable win condition.`,
      };
    }),
  };
}

function inferComparisonCategory(
  row: OmniversusBattle["comparison"][number],
): OmniversusBattle["comparison"][number]["category"] {
  if (row.category !== "WIN_CONDITION") return row.category;

  const text = row.reason.toLowerCase();

  if (SPEED_TEXT_PATTERN.test(text)) {
    return "SPEED";
  }

  if (AP_TEXT_PATTERN.test(text)) {
    return "AP";
  }

  if (DURABILITY_TEXT_PATTERN.test(text)) {
    return "DURABILITY";
  }

  if (ABILITY_TEXT_PATTERN.test(text) || /auto-dodg/.test(text)) {
    return "ABILITY";
  }

  return row.category;
}

function normalizeComparisonCategories(
  result: OmniversusBattle,
): OmniversusBattle {
  return {
    ...result,
    comparison: result.comparison.map((row) => ({
      ...row,
      category: inferComparisonCategory(row),
    })),
  };
}

function normalizeNarrativeHp(result: OmniversusBattle): OmniversusBattle {
  const sideHasHpRecoveryTrait = (side: "A" | "B") => {
    const fighter = result.fighters.find((item) => item.side === side);
    const profileText = fighter
      ? [
          fighter.profile.stamina,
          fighter.profile.abilities,
          fighter.profile.resistances,
          ...fighter.profile.win_conditions,
          ...fighter.profile.counters,
        ].join(" ")
      : "";
    const claimText = result.claims
      .filter(
        (claim) =>
          (claim.side === side || claim.side === "BOTH") &&
          (claim.category === "ABILITY" ||
            claim.category === "DURABILITY" ||
            claim.category === "RESISTANCE" ||
            claim.category === "STAMINA"),
      )
      .map((claim) => claim.text)
      .join(" ");

    return HP_RECOVERY_TEXT_PATTERN.test(`${profileText} ${claimText}`);
  };

  const stepUsesHpRecovery = (step: OmniversusBattle["narrative"][number]) =>
    HP_RECOVERY_TEXT_PATTERN.test(`${step.title} ${step.log} ${step.why}`);

  const normalizeHpValue = (
    currentHp: number,
    previousHp: number | null,
    canRecoverThisStep: boolean,
  ) => {
    if (previousHp === null || currentHp <= previousHp) return currentHp;

    return canRecoverThisStep ? currentHp : previousHp;
  };

  const canARecover = sideHasHpRecoveryTrait("A");
  const canBRecover = sideHasHpRecoveryTrait("B");
  let previousAHp: number | null = null;
  let previousBHp: number | null = null;

  return {
    ...result,
    narrative: result.narrative.map((step) => {
      const recoveryStep = stepUsesHpRecovery(step);
      const aHp = normalizeHpValue(
        step.a_hp,
        previousAHp,
        canARecover && recoveryStep,
      );
      const bHp = normalizeHpValue(
        step.b_hp,
        previousBHp,
        canBRecover && recoveryStep,
      );

      previousAHp = aHp;
      previousBHp = bHp;

      return {
        ...step,
        a_hp: aHp,
        b_hp: bHp,
      };
    }),
  };
}

function capScore(score: number, maxScore: number, seed = ""): number {
  const cappedScore = Math.min(score, maxScore);
  const upperBound = Math.min(maxScore, Math.round(score));

  return refinePercentageScore(cappedScore, seed || `${score}:${maxScore}`, {
    maxScore: upperBound,
    preserveBand: false,
  });
}

function confidenceForDifficulty(
  result: OmniversusBattle,
  decisiveRows: number,
): number {
  const seed = confidenceScoreSeed(result, "difficulty-confidence");

  if (result.verdict.winner_side === "DRAW") {
    return varyPercentageScore(43, `${seed}:draw`, 3);
  }

  if (result.verdict.winner_side === "INCONCLUSIVE") {
    return varyPercentageScore(34, `${seed}:inconclusive`, 3);
  }

  let score: number;

  switch (result.verdict.difficulty) {
    case "STOMP":
      score = 96;
      break;
    case "NO_DIFF":
      score = 94;
      break;
    case "LOW_DIFF":
      score = 87;
      break;
    case "MID_DIFF":
      score = 78;
      break;
    case "HIGH_DIFF":
      score = 71;
      break;
    case "EXTREME_DIFF":
      score = 59;
      break;
    case "INCONCLUSIVE":
      score = 34;
      break;
    default:
      score = 74;
      break;
  }

  if (decisiveRows >= 2) score = Math.max(score, 93);
  if (decisiveRows === 1) score = Math.max(score, 86);

  const winnerHasVeryHighRoute = result.win_conditions.some(
    (item) =>
      item.side === result.verdict.winner_side &&
      item.probability === "VERY_HIGH",
  );

  if (winnerHasVeryHighRoute) score = Math.max(score, 89);

  return varyPercentageScore(score, seed, 3);
}

function normalizeConfidenceBreakdown(
  result: OmniversusBattle,
): OmniversusBattle {
  const weakSourceClaims = result.claims.filter(isWeakSource);
  const weakDecisiveClaims = weakSourceClaims.filter(
    (claim) => claim.importance === "DECISIVE" && claim.supports_verdict,
  );
  const contestedScalingClaims = result.claims.filter(
    (claim) =>
      (claim.kind === "SCALING" || claim.kind === "CALC") &&
      (claim.contested ||
        claim.review_flag === "BAD_SCALING_RISK" ||
        claim.review_flag === "CALC_DISPUTE"),
  );
  const possibleOutliers = result.claims.some(
    (claim) => claim.outlier || claim.review_flag === "POSSIBLE_OUTLIER",
  );
  const contestedTier = result.fighters.some(
    (fighter) => fighter.tier.contested,
  );
  const decisiveRows = result.comparison.filter(
    (row) =>
      row.winner === result.verdict.winner_side && row.margin === "DECISIVE",
  ).length;
  const decisiveChainExists = result.argument_chains.some(
    (chain) => chain.id === result.verdict.decisive_chain_id,
  );
  const severeChainGap =
    !decisiveChainExists ||
    result.argument_chains.some(
      (chain) => isDecisiveOrWinnerChain(chain, result) && chainHasGap(chain),
    );
  const winnerDecisiveContestedAbility = result.ability_interactions.some(
    (row) =>
      row.attacker === result.verdict.winner_side &&
      row.impact === "WIN_CONDITION" &&
      (row.contested || row.effective === "UNCLEAR"),
  );
  const hasDataInputWarning =
    result.data_provenance.needs_manual_review ||
    result.data_provenance.mode !== "MANUAL" ||
    result.quality_flags.has_data_input_warning ||
    result.fighters.some((fighter) => fighter.origin.data_source !== "MANUAL");
  const seed = confidenceScoreSeed(result, "confidence-breakdown");

  let dataConfidence = refinePercentageScore(
    result.verdict.data_confidence_score || 100,
    `${seed}:data-start`,
  );

  if (hasDataInputWarning) {
    dataConfidence = capScore(dataConfidence, 90, `${seed}:data-input`);
  }
  if (weakSourceClaims.length > 0) {
    dataConfidence = capScore(dataConfidence, 90, `${seed}:weak-sources`);
  }
  if (weakDecisiveClaims.length > 0) {
    dataConfidence = capScore(dataConfidence, 70, `${seed}:weak-decisive`);
  }
  if (contestedScalingClaims.length > 0) {
    dataConfidence = capScore(dataConfidence, 75, `${seed}:contested-scaling`);
  }
  if (contestedTier) {
    dataConfidence = capScore(dataConfidence, 75, `${seed}:contested-tier`);
  }
  if (possibleOutliers) {
    dataConfidence = capScore(dataConfidence, 65, `${seed}:possible-outliers`);
  }
  if (severeChainGap) {
    dataConfidence = capScore(dataConfidence, 80, `${seed}:chain-gap-data`);
  }

  let verdictGivenData = blendPercentageScores(
    result.verdict.verdict_confidence_given_data_score,
    confidenceForDifficulty(result, decisiveRows),
    0.55,
    `${seed}:given-data-start`,
  );

  if (severeChainGap) {
    verdictGivenData = capScore(
      verdictGivenData,
      85,
      `${seed}:chain-gap-given`,
    );
  }
  if (winnerDecisiveContestedAbility) {
    verdictGivenData = capScore(
      verdictGivenData,
      65,
      `${seed}:contested-ability-given`,
    );
  }
  if (result.metadata.battle_type === "SUBJECTIVE") {
    verdictGivenData = capScore(verdictGivenData, 60, `${seed}:subjective`);
  }

  let verdictRobustness = blendPercentageScores(
    result.verdict.verdict_confidence_robustness_score,
    verdictGivenData,
    0.55,
    `${seed}:robustness-start`,
  );

  if (verdictRobustness > verdictGivenData) {
    verdictRobustness = capScore(
      verdictRobustness,
      verdictGivenData,
      `${seed}:robustness-not-above-given`,
    );
  }

  if (weakDecisiveClaims.length > 0) {
    verdictRobustness = capScore(
      verdictRobustness,
      result.verdict.difficulty === "STOMP" && decisiveRows >= 2 ? 90 : 75,
      `${seed}:weak-decisive-robustness`,
    );
  }
  if (contestedScalingClaims.length > 0) {
    verdictRobustness = capScore(
      verdictRobustness,
      result.verdict.difficulty === "STOMP" && decisiveRows >= 2 ? 90 : 80,
      `${seed}:scaling-robustness`,
    );
  }
  if (contestedTier) {
    verdictRobustness = capScore(
      verdictRobustness,
      85,
      `${seed}:tier-robustness`,
    );
  }
  if (possibleOutliers) {
    verdictRobustness = capScore(
      verdictRobustness,
      75,
      `${seed}:outlier-robustness`,
    );
  }
  if (severeChainGap) {
    verdictRobustness = capScore(
      verdictRobustness,
      80,
      `${seed}:chain-gap-robustness`,
    );
  }
  if (winnerDecisiveContestedAbility) {
    verdictRobustness = capScore(
      verdictRobustness,
      65,
      `${seed}:contested-ability-robustness`,
    );
  }

  const confidenceExplanation =
    "Data confidence measures source/input reliability; verdict confidence assumes those inputs; robustness estimates whether the winner changes under aggressive source review.";
  const hasConfidenceCap =
    result.quality_flags.has_confidence_cap ||
    dataConfidence < verdictGivenData ||
    verdictRobustness < verdictGivenData;

  return {
    ...result,
    quality_flags: {
      ...result.quality_flags,
      has_confidence_cap: hasConfidenceCap,
      confidence_cap_reason: hasConfidenceCap
        ? confidenceCapReason(
            result.quality_flags.confidence_cap_reason,
            "Confidence was capped by source, chain, or robustness review.",
          )
        : result.quality_flags.confidence_cap_reason,
    },
    verdict: {
      ...result.verdict,
      confidence_score: verdictRobustness,
      confidence_band: clampConfidenceBand(verdictRobustness),
      data_confidence_score: dataConfidence,
      data_confidence_band: clampConfidenceBand(dataConfidence),
      verdict_confidence_given_data_score: verdictGivenData,
      verdict_confidence_given_data_band: clampConfidenceBand(verdictGivenData),
      verdict_confidence_robustness_score: verdictRobustness,
      verdict_confidence_robustness_band:
        clampConfidenceBand(verdictRobustness),
      confidence_explanation: confidenceExplanation,
    },
  };
}

export function normalizeBattleResult(
  result: OmniversusBattle,
): OmniversusBattle {
  let next = result;

  if (next.metadata.battle_type === "SUBJECTIVE") {
    next = {
      ...next,
      ability_interactions: [],
      quality_flags: {
        ...next.quality_flags,
        has_confidence_cap:
          next.quality_flags.has_confidence_cap ||
          next.verdict.confidence_score > 60,
        confidence_cap_reason:
          next.quality_flags.has_confidence_cap ||
          next.verdict.confidence_score > 60
            ? confidenceCapReason(
                next.quality_flags.confidence_cap_reason,
                "Subjective battles cap verdict confidence at 60.",
              )
            : next.quality_flags.confidence_cap_reason,
      },
    };

    if (next.verdict.confidence_score > 60) {
      const subjectiveScore = capScore(
        next.verdict.confidence_score,
        60,
        confidenceScoreSeed(next, "subjective-battle"),
      );

      next = {
        ...next,
        verdict: {
          ...next.verdict,
          confidence_score: subjectiveScore,
          confidence_band: clampConfidenceBand(subjectiveScore),
        },
      };
    }
  }

  next = normalizeMetadataRuleConsistency(next);
  next = normalizeClaimTrust(next);
  next = normalizeChainConfidence(next);
  next = {
    ...next,
    appeals: next.appeals.map(normalizeAppealNeeded),
  };
  next = normalizeRuleImpact(next);
  next = normalizeAbilityWinConditionTypes(next);
  next = normalizeComparisonCategories(next);

  const normalizedAbilityInteractions: OmniversusBattle["ability_interactions"] =
    next.ability_interactions.map((row) => {
      const isExplicitlyIrrelevant =
        row.impact === "NONE" &&
        /irrelevant|not relevant|no impact|does not affect/.test(
          `${row.reason} ${row.relevance_to_win_condition}`.toLowerCase(),
        );
      const shouldContestMechanics =
        (row.effective === "UNCLEAR" || row.deliverable === false) &&
        !isExplicitlyIrrelevant;

      if (
        row.deliverable === false &&
        row.effective === "NO" &&
        !isExplicitlyIrrelevant
      ) {
        return {
          ...row,
          effective: "UNCLEAR" as const,
          contested: true,
          reason:
            row.reason.includes("not deliverable") ||
            row.reason.includes("cannot land") ||
            row.reason.includes("too fast")
              ? row.reason
              : `${row.reason} The ability is treated as not deliverable rather than mechanically ineffective.`,
        };
      }

      return shouldContestMechanics
        ? {
            ...row,
            contested: true,
          }
        : row;
    });

  next = {
    ...next,
    ability_interactions: normalizedAbilityInteractions,
  };

  next = normalizeAbilityWinConditionTypes(next);
  next = normalizeComparisonCategories(next);
  next = normalizeUtilityComparisonRows(next);

  const weakSourceClaims = next.claims.filter(isWeakSource);
  const weakDecisiveClaims = weakSourceClaims.filter(
    (claim) => claim.importance === "DECISIVE" && claim.supports_verdict,
  );
  const contestedScalingClaims = next.claims.filter(
    (claim) =>
      (claim.kind === "SCALING" || claim.kind === "CALC") &&
      (claim.contested ||
        claim.review_flag === "BAD_SCALING_RISK" ||
        claim.review_flag === "CALC_DISPUTE"),
  );
  const possibleOutliers = next.claims.some(
    (claim) => claim.outlier || claim.review_flag === "POSSIBLE_OUTLIER",
  );
  const mechanicsMismatch =
    next.quality_flags.has_mechanics_mismatch ||
    next.ability_interactions.some(
      (row) => row.effective === "UNCLEAR" || row.contested,
    );
  const contestedTier = next.fighters.some((fighter) => fighter.tier.contested);
  const decisiveContestedAbility = next.ability_interactions.some(
    (row) => row.impact === "WIN_CONDITION" && row.contested,
  );
  const hasDataInputWarning =
    next.quality_flags.has_data_input_warning ||
    next.data_provenance.needs_manual_review ||
    next.data_provenance.mode === "EXTRACTED_FANDOM" ||
    next.data_provenance.mode === "EXTRACTED_VSBW" ||
    next.data_provenance.mode === "MIXED" ||
    next.data_provenance.mode === "MODEL_INFERRED" ||
    next.data_provenance.mode === "UNKNOWN" ||
    next.fighters.some(
      (fighter) =>
        fighter.origin.data_source === "EXTRACTED_FANDOM" ||
        fighter.origin.data_source === "EXTRACTED_VSBW" ||
        fighter.origin.data_source === "MIXED" ||
        fighter.origin.data_source === "MODEL_INFERRED" ||
        fighter.origin.data_source === "UNKNOWN",
    );

  const decisiveChainExists = next.argument_chains.some(
    (chain) => chain.id === next.verdict.decisive_chain_id,
  );
  const anyChainGap =
    next.quality_flags.has_chain_gap ||
    next.argument_chains.some(chainHasGap) ||
    !decisiveChainExists;
  const severeChainGap =
    !decisiveChainExists ||
    next.argument_chains.some(
      (chain) => isDecisiveOrWinnerChain(chain, next) && chainHasGap(chain),
    );
  const confidenceCapApplies =
    next.quality_flags.has_confidence_cap ||
    weakDecisiveClaims.length > 0 ||
    decisiveContestedAbility ||
    contestedTier ||
    hasDataInputWarning ||
    severeChainGap;

  next = {
    ...next,
    stat_model: {
      ...next.stat_model,
      numerical_stats_role:
        next.stat_model.numerical_stats_role === "PRIMARY"
          ? "SECONDARY"
          : next.stat_model.numerical_stats_role,
      hax_is_not_numeric: true,
    },
    quality_flags: {
      ...next.quality_flags,
      has_unverified_sources:
        next.quality_flags.has_unverified_sources ||
        weakSourceClaims.length > 0,
      has_contested_scaling:
        next.quality_flags.has_contested_scaling ||
        contestedScalingClaims.length > 0 ||
        contestedTier,
      has_possible_outliers:
        next.quality_flags.has_possible_outliers || possibleOutliers,
      has_mechanics_mismatch: mechanicsMismatch,
      has_confidence_cap: confidenceCapApplies,
      has_data_input_warning: hasDataInputWarning,
      has_chain_gap: anyChainGap,
      most_fragile_assumption:
        next.quality_flags.most_fragile_assumption.trim().length > 0
          ? next.quality_flags.most_fragile_assumption
          : "No fragile assumption identified.",
      confidence_cap_reason: confidenceCapApplies
        ? confidenceCapReason(
            next.quality_flags.confidence_cap_reason,
            "Confidence was capped by data, tier, ability, or chain review.",
          )
        : next.quality_flags.confidence_cap_reason,
    },
  };

  if (hasDataInputWarning) {
    next = capConfidence(
      next,
      90,
      "Data provenance needs review before this should be treated as fully verified.",
    );
  }

  if (severeChainGap) {
    next = capConfidence(
      next,
      85,
      "The decisive logical chain has a contested, missing, or rule-only premise.",
    );
  }

  if (weakDecisiveClaims.length > 0) {
    next = capConfidence(
      next,
      70,
      "A decisive claim needs stronger source verification.",
    );
  } else if (weakSourceClaims.length > 0) {
    next = capConfidence(
      next,
      90,
      "Some supporting sources are broad or need verification.",
    );
  }

  if (decisiveContestedAbility) {
    next = capConfidence(
      next,
      65,
      "A winner-deciding ability interaction is contested.",
    );
  }

  if (contestedTier) {
    next = capConfidence(next, 75, "At least one fighter tier is contested.");
  }

  next = normalizeConfidenceBreakdown(next);
  next = normalizeAuditTrust(next);
  next = mergeAutoAppeals(next);

  const stamp = next.ui.verdict_stamp.trim();
  if (
    stamp.length < 8 ||
    stamp === next.verdict.difficulty ||
    stamp.toLowerCase() === next.ui.card_variant.toLowerCase()
  ) {
    next = {
      ...next,
      ui: {
        ...next.ui,
        verdict_stamp: `${next.verdict.winner_name} WINS // ${next.verdict.difficulty}`,
      },
    };
  }

  if (!next.ui.chain_teaser.trim()) {
    const decisiveChain = next.argument_chains.find(
      (chain) => chain.id === next.verdict.decisive_chain_id,
    );

    next = {
      ...next,
      ui: {
        ...next.ui,
        chain_teaser: decisiveChain
          ? decisiveChain.conclusion
          : next.verdict.primary_reason,
      },
    };
  }

  next = normalizeRuleImpact(next);
  next = normalizeRecommendedRematch(next);
  next = normalizeNarrativeHp(next);

  const shouldUseStompCard =
    next.verdict.difficulty === "STOMP" &&
    next.verdict.winner_side !== "DRAW" &&
    next.verdict.winner_side !== "INCONCLUSIVE";

  if (shouldUseStompCard && next.ui.card_variant !== "STOMP") {
    next = {
      ...next,
      ui: {
        ...next.ui,
        card_variant: "STOMP",
        primary_badge: next.quality_flags.has_confidence_cap
          ? "STOMP // REVIEW NEEDED"
          : next.ui.primary_badge || "STOMP",
      },
    };
  } else if (!next.ui.primary_badge.trim()) {
    next = {
      ...next,
      ui: {
        ...next.ui,
        primary_badge: next.quality_flags.has_confidence_cap
          ? `${next.verdict.difficulty} // REVIEW NEEDED`
          : next.verdict.difficulty,
      },
    };
  }

  return orderBattleResult(next);
}
export const enforceBusinessCaps = normalizeBattleResult;
