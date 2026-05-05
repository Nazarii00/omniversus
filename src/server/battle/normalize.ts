import type { OmniversusBattle } from "./schema";
import {
  asString,
  clampConfidenceBand,
  isWeakAppealNeeded,
  looksLikeAbilityWinCondition,
} from "./coerce";

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
const STAMINA_TEXT_PATTERN = /stamina|endurance|time limit|exhaust/i;
const ABILITY_TEXT_PATTERN =
  /ability|hax|drain|seal|bfr|dodge|contact|passive|mind|soul|time|space|concept|causal/i;
const RESISTANCE_TEXT_PATTERN = /resist|immune|counter/i;
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

function isPureRuleOrAssumptionPremise(
  premise: OmniversusBattle["argument_chains"][number]["premises"][number],
): boolean {
  return premise.role === "RULE" || premise.role === "ASSUMPTION";
}

function inferClaimIdForPremise(
  premise: OmniversusBattle["argument_chains"][number]["premises"][number],
  chain: OmniversusBattle["argument_chains"][number],
  result: OmniversusBattle,
): string | null {
  const text = `${premise.text} ${chain.conclusion} ${chain.inference}`
    .toLowerCase()
    .replace(/[^\w\s]/g, " ");

  const findClaim = (
    side: "A" | "B" | null,
    categories: Array<OmniversusBattle["claims"][number]["category"]>,
  ) =>
    result.claims.find(
      (claim) =>
        (side === null || claim.side === side || claim.side === "BOTH") &&
        categories.includes(claim.category),
    )?.id ?? null;

  const mentionsFighter = (side: "A" | "B") => {
    const name = result.fighters.find((fighter) => fighter.side === side)?.name;
    const tokens = asString(name)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3);

    return tokens.some((token) => text.includes(token));
  };
  const mentionsSideA =
    mentionsFighter("A") || /\b(side|fighter|combatant)\s+a\b/.test(text);
  const mentionsSideB =
    mentionsFighter("B") || /\b(side|fighter|combatant)\s+b\b/.test(text);
  const inferredCategory = claimCategoryFromText(text);

  if (inferredCategory) {
    const categories =
      inferredCategory === "AP"
        ? (["AP", "DURABILITY"] as ClaimCategory[])
        : ([inferredCategory] as ClaimCategory[]);

    if (mentionsSideA && !mentionsSideB) {
      return findClaim("A", categories) ?? findClaim(null, categories);
    }

    if (mentionsSideB && !mentionsSideA) {
      return findClaim("B", categories) ?? findClaim(null, categories);
    }

    if (chain.side === "A" || chain.side === "B") {
      return findClaim(chain.side, categories) ?? findClaim(null, categories);
    }

    return findClaim(null, categories);
  }

  if (chain.side === "A" || chain.side === "B") {
    return findClaim(chain.side, ["AP", "SPEED", "WIN_CONDITION"]);
  }

  return null;
}

function repairChainPremises(
  result: OmniversusBattle,
): OmniversusBattle {
  return {
    ...result,
    argument_chains: result.argument_chains.map((chain) => {
      const premises = chain.premises.map((premise) => {
        if (
          premise.claim_id !== "N_A" ||
          isPureRuleOrAssumptionPremise(premise)
        ) {
          return premise;
        }

        const claimId = inferClaimIdForPremise(premise, chain, result);
        return claimId
          ? { ...premise, claim_id: claimId }
          : {
              ...premise,
              role: "ASSUMPTION" as const,
              contested: true,
            };
      });
      const linkedClaimIds = uniqueStrings(
        [
          ...chain.linked_claim_ids,
          ...premises
            .map((premise) => premise.claim_id)
            .filter((claimId) => claimId !== "N_A"),
        ],
        8,
      );

      return {
        ...chain,
        premises,
        linked_claim_ids: linkedClaimIds,
      };
    }),
  };
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

type BattleSide = "A" | "B";
type ClaimCategory = OmniversusBattle["claims"][number]["category"];
type Fighter = OmniversusBattle["fighters"][number];

const PROFILE_CLAIM_CATEGORIES = [
  "AP",
  "DURABILITY",
  "SPEED",
  "STAMINA",
  "ABILITY",
  "RESISTANCE",
] as const satisfies readonly ClaimCategory[];
type ProfileClaimCategory = (typeof PROFILE_CLAIM_CATEGORIES)[number];

function isProfileClaimCategory(
  category: ClaimCategory,
): category is ProfileClaimCategory {
  return (PROFILE_CLAIM_CATEGORIES as readonly ClaimCategory[]).includes(
    category,
  );
}

function claimCategoryFromText(text: string): ClaimCategory | null {
  if (SPEED_TEXT_PATTERN.test(text)) {
    return "SPEED";
  }

  if (DURABILITY_TEXT_PATTERN.test(text)) {
    return "DURABILITY";
  }

  if (STAMINA_TEXT_PATTERN.test(text)) {
    return "STAMINA";
  }

  if (ABILITY_TEXT_PATTERN.test(text)) {
    return "ABILITY";
  }

  if (RESISTANCE_TEXT_PATTERN.test(text)) {
    return "RESISTANCE";
  }

  if (AP_TEXT_PATTERN.test(text)) {
    return "AP";
  }

  return null;
}

function textMentionsSide(
  result: OmniversusBattle,
  side: BattleSide,
  text: string,
): boolean {
  const fighter = result.fighters.find((item) => item.side === side);
  const normalized = text.toLowerCase();
  const tokens = asString(fighter?.name)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);

  return (
    tokens.some((token) => normalized.includes(token)) ||
    new RegExp(`\\b(side|fighter|combatant)\\s+${side.toLowerCase()}\\b`).test(
      normalized,
    )
  );
}

function inferSideFromText(
  result: OmniversusBattle,
  text: string,
): BattleSide | null {
  const mentionsA = textMentionsSide(result, "A", text);
  const mentionsB = textMentionsSide(result, "B", text);

  if (mentionsA && !mentionsB) return "A";
  if (mentionsB && !mentionsA) return "B";
  return null;
}

function profileValueForClaimCategory(
  fighter: Fighter,
  category: ClaimCategory,
): string {
  switch (category) {
    case "AP":
      return fighter.profile.ap;
    case "DURABILITY":
      return fighter.profile.durability;
    case "SPEED":
      return fighter.profile.speed;
    case "STAMINA":
      return fighter.profile.stamina;
    case "ABILITY":
      return fighter.profile.abilities;
    case "RESISTANCE":
      return fighter.profile.resistances;
    default:
      return "";
  }
}

function profileClaimText(
  fighter: Fighter,
  category: ClaimCategory,
  value: string,
): string {
  switch (category) {
    case "AP":
      return `${fighter.name}'s generated profile lists attack potency as ${value}.`;
    case "DURABILITY":
      return `${fighter.name}'s generated profile lists durability as ${value}.`;
    case "SPEED":
      return `${fighter.name}'s generated profile lists speed as ${value}.`;
    case "STAMINA":
      return `${fighter.name}'s generated profile lists stamina as ${value}.`;
    case "ABILITY":
      return `${fighter.name}'s generated profile lists relevant abilities as ${value}.`;
    case "RESISTANCE":
      return `${fighter.name}'s generated profile lists resistances as ${value}.`;
    default:
      return `${fighter.name}'s generated profile lists ${category.toLowerCase()} as ${value}.`;
  }
}

function hasClaimForSideCategory(
  result: OmniversusBattle,
  side: BattleSide,
  category: ClaimCategory,
): boolean {
  return result.claims.some(
    (claim) =>
      (claim.side === side || claim.side === "BOTH") &&
      claim.category === category,
  );
}

function ensureProfileClaimsForReferencedStats(
  result: OmniversusBattle,
): OmniversusBattle {
  const needed = new Map<string, { side: BattleSide; category: ClaimCategory }>();
  const addNeed = (side: BattleSide, category: ClaimCategory | null) => {
    if (!category || !isProfileClaimCategory(category)) return;
    if (hasClaimForSideCategory(result, side, category)) return;

    const fighter = result.fighters.find((item) => item.side === side);
    if (!fighter || !profileValueForClaimCategory(fighter, category).trim()) {
      return;
    }

    needed.set(`${side}:${category}`, { side, category });
  };

  for (const chain of result.argument_chains) {
    for (const premise of chain.premises) {
      if (premise.claim_id !== "N_A" || isPureRuleOrAssumptionPremise(premise)) {
        continue;
      }

      const side =
        inferSideFromText(result, premise.text) ??
        (chain.side === "A" || chain.side === "B" ? chain.side : null);
      if (side) addNeed(side, claimCategoryFromText(premise.text));
    }
  }

  for (const row of result.comparison) {
    if (!isProfileClaimCategory(row.category)) continue;

    addNeed("A", row.category);
    addNeed("B", row.category);
  }

  if (needed.size === 0 || result.claims.length >= 14) return result;

  const additions: OmniversusBattle["claims"] = [];

  for (const { side, category } of needed.values()) {
    if (result.claims.length + additions.length >= 14) break;

    const fighter = result.fighters.find((item) => item.side === side);
    if (!fighter) continue;

    const value = profileValueForClaimCategory(fighter, category);
    const id = `auto_${side.toLowerCase()}_${category.toLowerCase()}_profile`;

    additions.push({
      id,
      side,
      kind: "DATA_QUALITY",
      tag: "INTERPRETATION",
      category,
      text: profileClaimText(fighter, category, value),
      source: {
        type: "UNKNOWN",
        ref: "Generated fighter profile",
        status: "REQUIRES_VERIFICATION",
        reliability: "UNKNOWN",
        note: "Auto-created to connect generated profile stats to argument chains.",
      },
      evidence_level: "UNKNOWN",
      importance: side === result.verdict.winner_side ? "HIGH" : "MEDIUM",
      confidence: 40,
      supports_verdict: side === result.verdict.winner_side,
      review_flag: "DATA_INPUT_RISK",
      contested: true,
      outlier: false,
      appeal_hint: "Replace with a source-backed claim.",
    });
  }

  return {
    ...result,
    claims: [...result.claims, ...additions],
  };
}

export function capConfidence(
  result: OmniversusBattle,
  maxScore: number,
  reason: string,
): OmniversusBattle {
  if (result.verdict.confidence_score <= maxScore) {
    return result;
  }

  const riskFactors =
    result.verdict.risk_factors.length === 1 &&
    result.verdict.risk_factors[0].toLowerCase() === "none"
      ? [reason]
      : uniqueStrings([...result.verdict.risk_factors, reason], 5);

  return {
    ...result,
    verdict: {
      ...result.verdict,
      confidence_score: maxScore,
      confidence_band: clampConfidenceBand(maxScore),
      risk_factors: riskFactors,
    },
    quality_flags: {
      ...result.quality_flags,
      has_confidence_cap: true,
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
    (row) => row.contested || row.effective === null,
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

function findBestChainForSide(
  result: OmniversusBattle,
  side: "A" | "B",
): string[] {
  const best = result.argument_chains.find(
    (chain) =>
      chain.side === side &&
      (chain.chain_type === "WIN_CONDITION" ||
        chain.chain_type === "STAT_ADVANTAGE" ||
        chain.chain_type === "ABILITY_INTERACTION" ||
        chain.chain_type === "ANTI_ARGUMENT"),
  );

  return best ? [best.id] : [];
}

function findBestClaimsForSide(
  result: OmniversusBattle,
  side: "A" | "B",
): string[] {
  return result.claims
    .filter((claim) => claim.side === side || claim.side === "BOTH")
    .map((claim) => claim.id)
    .slice(0, 3);
}

function isAbilityLikeWinCondition(
  item: OmniversusBattle["win_conditions"][number],
): boolean {
  const text = `${item.method} ${item.requires} ${item.blocked_by}`;

  return (
    item.type === "ABILITY" ||
    item.type === "BFR" ||
    looksLikeAbilityWinCondition(text)
  );
}

function hasAbilityMethodOverlap(
  row: OmniversusBattle["ability_interactions"][number],
  winCondition: OmniversusBattle["win_conditions"][number],
): boolean {
  const method = winCondition.method.trim().toLowerCase();
  const rowText = `${row.ability} ${row.relevance_to_win_condition}`
    .trim()
    .toLowerCase();

  if (!method || !rowText) return false;
  if (rowText.includes(method) || method.includes(row.ability.toLowerCase())) {
    return true;
  }

  return method
    .split(/[^a-z0-9]+/i)
    .filter((part) => part.length >= 4)
    .some((part) => rowText.includes(part));
}

function inferAbilityTypeFromText(
  text: string,
): OmniversusBattle["ability_interactions"][number]["ability_type"] {
  const lower = text.toLowerCase();

  if (/seal/.test(lower)) return "SEALING";
  if (/domain/.test(lower)) return "DOMAIN";
  if (/contract|binding/.test(lower)) return "CONTRACT";
  if (/mind|mental/.test(lower)) return "MIND";
  if (/soul/.test(lower)) return "SOUL";
  if (/bfr|remove|banish/.test(lower)) return "BFR";
  if (/concept/.test(lower)) return "CONCEPTUAL";
  if (/causal|fate/.test(lower)) return "CAUSALITY";
  if (/time/.test(lower)) return "TIME";
  if (/space|spatial|infinity/.test(lower)) return "SPACE";
  if (/passive/.test(lower)) return "PASSIVE";

  return "OTHER";
}

function ensureWinConditionsForBothSides(
  result: OmniversusBattle,
): OmniversusBattle {
  const hasA = result.win_conditions.some((item) => item.side === "A");
  const hasB = result.win_conditions.some((item) => item.side === "B");

  if (hasA && hasB) return result;

  const missingSides: Array<"A" | "B"> = [];
  if (!hasA) missingSides.push("A");
  if (!hasB) missingSides.push("B");

  const autoWinConditions = missingSides.flatMap((missingSide) => {
    const fighter = result.fighters.find((item) => item.side === missingSide);
    if (!fighter) return [];

    const isWinner = missingSide === result.verdict.winner_side;
    const isSubjective = result.metadata.battle_type === "SUBJECTIVE";

    return [
      {
        id: `AUTO_${missingSide}_FALLBACK_PATH`,
        side: missingSide,
        method: isWinner
          ? result.verdict.primary_reason
          : fighter.best_argument || "Fallback argument only",
        type: isSubjective ? "SUBJECTIVE_EDGE" : "STAT_CHECK",
        requires: isWinner
          ? "The main verdict chain remains valid."
          : result.verdict.flip_condition ||
            "A major interpretation, rule, resistance, or stat assumption change.",
        blocked_by: isWinner
          ? "Not blocked; this side is already the predicted winner."
          : result.verdict.primary_reason,
        probability: isWinner ? "HIGH" : "VERY_LOW",
        claim_ids: findBestClaimsForSide(result, missingSide),
        chain_ids: findBestChainForSide(result, missingSide),
        contested: !isWinner,
      } satisfies OmniversusBattle["win_conditions"][number],
    ];
  });

  if (autoWinConditions.length === 0) return result;

  const merged = [...result.win_conditions, ...autoWinConditions];

  const firstBySide = merged.filter((item, index, array) => {
    return array.findIndex((other) => other.side === item.side) === index;
  });

  const rest = merged.filter(
    (item) => !firstBySide.some((kept) => kept.id === item.id),
  );

  return {
    ...result,
    win_conditions: [...firstBySide, ...rest].slice(0, 6),
  };
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

function attachChainsToWinConditions(
  result: OmniversusBattle,
): OmniversusBattle {
  return {
    ...result,
    win_conditions: result.win_conditions.map((item) => {
      if (item.chain_ids.length > 0) return item;

      const chainIds = findBestChainForSide(result, item.side);
      return {
        ...item,
        chain_ids: chainIds,
        contested: item.contested || chainIds.length === 0,
      };
    }),
  };
}

function findClaimIdsForChains(
  result: OmniversusBattle,
  chainIds: string[],
): string[] {
  return uniqueStrings(
    chainIds.flatMap((chainId) => {
      const chain = result.argument_chains.find((item) => item.id === chainId);
      if (!chain) return [];

      return [
        ...chain.linked_claim_ids,
        ...chain.premises
          .map((premise) => premise.claim_id)
          .filter((claimId) => claimId !== "N_A"),
      ];
    }),
    4,
  );
}

function attachClaimsToWinConditions(
  result: OmniversusBattle,
): OmniversusBattle {
  return {
    ...result,
    win_conditions: result.win_conditions.map((item) => {
      const claimIds = uniqueStrings(
        [
          ...item.claim_ids,
          ...findClaimIdsForChains(result, item.chain_ids),
        ],
        4,
      );

      if (claimIds.length > 0) {
        return {
          ...item,
          claim_ids: claimIds,
        };
      }

      return {
        ...item,
        claim_ids: findBestClaimsForSide(result, item.side),
      };
    }),
  };
}

function ensureAbilityInteractionsForAbilityRoutes(
  result: OmniversusBattle,
): OmniversusBattle {
  const missingRoutes = result.win_conditions.filter((item) => {
    if (!isAbilityLikeWinCondition(item)) return false;

    return !result.ability_interactions.some(
      (row) =>
        row.attacker === item.side &&
        (row.chain_ids.some((id) => item.chain_ids.includes(id)) ||
          hasAbilityMethodOverlap(row, item)),
    );
  });

  if (missingRoutes.length === 0) return result;

  const autoInteractions = missingRoutes.map((item, index) => {
    const defender: "A" | "B" = item.side === "A" ? "B" : "A";
    const text = `${item.method} ${item.requires} ${item.blocked_by}`;

    return {
      id: `AUTO_${item.side}_ABILITY_${index + 1}`,
      attacker: item.side,
      defender,
      ability: item.method || "Theoretical ability route",
      ability_type: inferAbilityTypeFromText(text),
      activation: item.requires || "Source requires verification.",
      range: "Source requires verification.",
      timing: "Source requires verification.",
      target_requirement: item.requires || "Source requires verification.",
      defender_resistance: item.blocked_by || "Source requires verification.",
      resistance_basis:
        "Auto-created from win condition; manual review recommended.",
      structurally_similar_resistance: "Source requires verification.",
      deliverable: item.probability !== "VERY_LOW",
      effective: null,
      relevance_to_win_condition: item.method,
      reason:
        "Auto-created because an ability-like win condition lacked an ability interaction log.",
      counterplay: item.blocked_by || "Source requires verification.",
      contested: true,
      impact:
        item.probability === "VERY_HIGH" || item.probability === "HIGH"
          ? "WIN_CONDITION"
          : "MINOR",
      claim_ids: item.claim_ids,
      chain_ids: item.chain_ids,
    } satisfies OmniversusBattle["ability_interactions"][number];
  });

  return {
    ...result,
    ability_interactions: [
      ...result.ability_interactions,
      ...autoInteractions,
    ].slice(0, 8),
    quality_flags: {
      ...result.quality_flags,
      has_mechanics_mismatch: true,
    },
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
      const weakDecisiveClaim =
        weakEvidence && claim.importance === "DECISIVE";

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
        confidence: Math.min(claim.confidence, 75),
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
        confidence: Math.min(chain.confidence, chain.contested ? 65 : 75),
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
  const modelAppeals = result.appeals.filter((appeal) => !isWeakModelAppeal(appeal));
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

function claimIdsForCategory(
  result: OmniversusBattle,
  category: ClaimCategory,
): string[] {
  return result.claims
    .filter((claim) => claim.category === category)
    .map((claim) => claim.id);
}

function attachClaimsToComparisonRows(
  result: OmniversusBattle,
): OmniversusBattle {
  return {
    ...result,
    comparison: result.comparison.map((row) => {
      if (!isProfileClaimCategory(row.category)) return row;

      return {
        ...row,
        claim_ids: uniqueStrings(
          [...row.claim_ids, ...claimIdsForCategory(result, row.category)],
          4,
        ),
      };
    }),
  };
}

function normalizeNarrativeHp(result: OmniversusBattle): OmniversusBattle {
  if (result.verdict.winner_side !== "A" && result.verdict.winner_side !== "B") {
    return result;
  }

  const winner = result.verdict.winner_side;
  let previousLoserHp = 100;

  return {
    ...result,
    narrative: result.narrative.map((step, index, steps) => {
      const isFinalStep = index === steps.length - 1;

      if (winner === "A") {
        const bHp = isFinalStep ? 0 : Math.min(step.b_hp, previousLoserHp);
        previousLoserHp = bHp;

        return {
          ...step,
          a_hp: isFinalStep ? 100 : step.a_hp,
          b_hp: bHp,
        };
      }

      const aHp = isFinalStep ? 0 : Math.min(step.a_hp, previousLoserHp);
      previousLoserHp = aHp;

      return {
        ...step,
        a_hp: aHp,
        b_hp: isFinalStep ? 100 : step.b_hp,
      };
    }),
  };
}

function inferDifficultyFromResult(result: OmniversusBattle): OmniversusBattle {
  if (
    result.verdict.difficulty !== "INCONCLUSIVE" ||
    (result.verdict.winner_side !== "A" && result.verdict.winner_side !== "B")
  ) {
    return result;
  }

  const text = [
    result.verdict.primary_reason,
    result.verdict.summary_3_sentences,
    result.ui.verdict_stamp,
    result.ui.chain_teaser,
    result.ui.card_variant,
  ]
    .join(" ")
    .toLowerCase();

  let difficulty: OmniversusBattle["verdict"]["difficulty"] = "MID_DIFF";

  const decisiveRows = result.comparison.filter(
    (row) =>
      row.winner === result.verdict.winner_side && row.margin === "DECISIVE",
  ).length;

  if (/stomp|no viable path|zero viable|statistical mismatch/.test(text)) {
    difficulty = "STOMP";
  } else if (
    /easy|low diff|low difficulty|overwhelming|insurmountable/.test(text)
  ) {
    difficulty = decisiveRows >= 2 ? "STOMP" : "LOW_DIFF";
  } else if (decisiveRows >= 2) {
    difficulty = "STOMP";
  } else if (decisiveRows === 1) {
    difficulty = "LOW_DIFF";
  }

  return {
    ...result,
    verdict: {
      ...result.verdict,
      difficulty,
    },
  };
}

function capScore(score: number, maxScore: number): number {
  return Math.min(score, maxScore);
}

function confidenceForDifficulty(
  result: OmniversusBattle,
  decisiveRows: number,
): number {
  if (result.verdict.winner_side === "DRAW") return 45;
  if (result.verdict.winner_side === "INCONCLUSIVE") return 35;

  let score: number;

  switch (result.verdict.difficulty) {
    case "STOMP":
      score = 97;
      break;
    case "NO_DIFF":
      score = 96;
      break;
    case "LOW_DIFF":
      score = 90;
      break;
    case "MID_DIFF":
      score = 80;
      break;
    case "HIGH_DIFF":
      score = 72;
      break;
    case "EXTREME_DIFF":
      score = 62;
      break;
    case "INCONCLUSIVE":
      score = 35;
      break;
    default:
      score = 75;
      break;
  }

  if (decisiveRows >= 2) score = Math.max(score, 95);
  if (decisiveRows === 1) score = Math.max(score, 88);

  const winnerHasVeryHighRoute = result.win_conditions.some(
    (item) =>
      item.side === result.verdict.winner_side &&
      item.probability === "VERY_HIGH",
  );

  if (winnerHasVeryHighRoute) score = Math.max(score, 92);

  return score;
}

function normalizeConfidenceBreakdown(result: OmniversusBattle): OmniversusBattle {
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
  const contestedTier = result.fighters.some((fighter) => fighter.tier.contested);
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
      (row.contested || row.effective === null),
  );
  const hasDataInputWarning =
    result.data_provenance.needs_manual_review ||
    result.data_provenance.mode !== "MANUAL" ||
    result.quality_flags.has_data_input_warning ||
    result.fighters.some((fighter) => fighter.origin.data_source !== "MANUAL");

  let dataConfidence = 100;

  if (hasDataInputWarning) dataConfidence = capScore(dataConfidence, 90);
  if (weakSourceClaims.length > 0) dataConfidence = capScore(dataConfidence, 90);
  if (weakDecisiveClaims.length > 0) dataConfidence = capScore(dataConfidence, 70);
  if (contestedScalingClaims.length > 0) {
    dataConfidence = capScore(dataConfidence, 75);
  }
  if (contestedTier) dataConfidence = capScore(dataConfidence, 75);
  if (possibleOutliers) dataConfidence = capScore(dataConfidence, 65);
  if (severeChainGap) dataConfidence = capScore(dataConfidence, 80);

  let verdictGivenData = confidenceForDifficulty(result, decisiveRows);

  if (severeChainGap) verdictGivenData = capScore(verdictGivenData, 85);
  if (winnerDecisiveContestedAbility) {
    verdictGivenData = capScore(verdictGivenData, 65);
  }
  if (result.metadata.battle_type === "SUBJECTIVE") {
    verdictGivenData = capScore(verdictGivenData, 60);
  }

  let verdictRobustness = verdictGivenData;

  if (weakDecisiveClaims.length > 0) {
    verdictRobustness = capScore(
      verdictRobustness,
      result.verdict.difficulty === "STOMP" && decisiveRows >= 2 ? 90 : 75,
    );
  }
  if (contestedScalingClaims.length > 0) {
    verdictRobustness = capScore(
      verdictRobustness,
      result.verdict.difficulty === "STOMP" && decisiveRows >= 2 ? 90 : 80,
    );
  }
  if (contestedTier) verdictRobustness = capScore(verdictRobustness, 85);
  if (possibleOutliers) verdictRobustness = capScore(verdictRobustness, 75);
  if (severeChainGap) verdictRobustness = capScore(verdictRobustness, 80);
  if (winnerDecisiveContestedAbility) {
    verdictRobustness = capScore(verdictRobustness, 65);
  }

  const confidenceExplanation =
    "Data confidence measures source/input reliability; verdict confidence assumes those inputs; robustness estimates whether the winner changes under aggressive source review.";

  return {
    ...result,
    quality_flags: {
      ...result.quality_flags,
      has_confidence_cap:
        result.quality_flags.has_confidence_cap ||
        dataConfidence < verdictGivenData ||
        verdictRobustness < verdictGivenData,
    },
    verdict: {
      ...result.verdict,
      confidence_score: verdictRobustness,
      confidence_band: clampConfidenceBand(verdictRobustness),
      data_confidence_score: dataConfidence,
      data_confidence_band: clampConfidenceBand(dataConfidence),
      verdict_confidence_given_data_score: verdictGivenData,
      verdict_confidence_given_data_band:
        clampConfidenceBand(verdictGivenData),
      verdict_confidence_robustness_score: verdictRobustness,
      verdict_confidence_robustness_band:
        clampConfidenceBand(verdictRobustness),
      confidence_explanation: confidenceExplanation,
    },
  };
}

export function normalizeBattleResult(result: OmniversusBattle): OmniversusBattle {
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
      },
    };

    if (next.verdict.confidence_score > 60) {
      next = {
        ...next,
        verdict: {
          ...next.verdict,
          confidence_score: 60,
          confidence_band: "CONTESTED_50_64",
        },
      };
    }
  }

  next = normalizeClaimTrust(next);
  next = ensureProfileClaimsForReferencedStats(next);
  next = repairChainPremises(next);
  next = normalizeChainConfidence(next);
  next = {
    ...next,
    appeals: next.appeals.map(normalizeAppealNeeded),
  };
  next = normalizeRuleImpact(next);
  next = inferDifficultyFromResult(next);
  next = normalizeAbilityWinConditionTypes(next);
  next = attachChainsToWinConditions(next);
  next = attachClaimsToWinConditions(next);
  next = ensureAbilityInteractionsForAbilityRoutes(next);
  next = normalizeComparisonCategories(next);
  next = attachClaimsToComparisonRows(next);

  const normalizedAbilityInteractions = next.ability_interactions.map((row) => {
    const isExplicitlyIrrelevant =
      row.impact === "NONE" &&
      /irrelevant|not relevant|no impact|does not affect/.test(
        `${row.reason} ${row.relevance_to_win_condition}`.toLowerCase(),
      );
    const shouldContestMechanics =
      (row.effective === null || row.deliverable === false) &&
      !isExplicitlyIrrelevant;

    if (
      row.deliverable === false &&
      row.effective === false &&
      !isExplicitlyIrrelevant
    ) {
      return {
        ...row,
        effective: null,
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

  next = ensureWinConditionsForBothSides(next);
  next = normalizeAbilityWinConditionTypes(next);
  next = attachChainsToWinConditions(next);
  next = attachClaimsToWinConditions(next);
  next = ensureAbilityInteractionsForAbilityRoutes(next);
  next = normalizeComparisonCategories(next);
  next = attachClaimsToComparisonRows(next);
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
      (row) => row.effective === null || row.contested,
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
      has_confidence_cap:
        next.quality_flags.has_confidence_cap ||
        weakDecisiveClaims.length > 0 ||
        decisiveContestedAbility ||
        contestedTier ||
        hasDataInputWarning ||
        severeChainGap,
      has_data_input_warning: hasDataInputWarning,
      has_chain_gap: anyChainGap,
      most_fragile_assumption:
        next.quality_flags.most_fragile_assumption.trim().length > 0
          ? next.quality_flags.most_fragile_assumption
          : "No fragile assumption identified.",
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

  return next;
}
export const enforceBusinessCaps = normalizeBattleResult;
