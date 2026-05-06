import type { CoerceBattleDraftContext } from "./coerceTypes";
import {
  APPEAL_REASON_VALUES,
  CATEGORY_VALUES,
  CLAIM_KIND_VALUES,
  CLAIM_TAG_VALUES,
  DATA_PROVENANCE_VALUES,
  DIFFICULTY_VALUES,
  EVIDENCE_LEVEL_VALUES,
  IMPORTANCE_VALUES,
  REVIEW_FLAG_VALUES,
  SIDE_VALUES,
  SOURCE_RELIABILITY_VALUES,
  SOURCE_STATUS_VALUES,
  SOURCE_TYPE_VALUES,
} from "./coerceValues";
import {
  asArray,
  asBoolean,
  asRecord,
  asString,
  asStringArray,
  clampInt,
  normalizeToken,
  pickEnum,
} from "./coerceUtils";

export function normalizeSide(
  value: unknown,
  fighters: Array<Record<string, unknown>>,
  fallback: "A" | "B",
): "A" | "B" {
  const token = normalizeToken(value);
  if (token === "A" || token === "FIGHTER_A" || token === "CHARACTER_A") {
    return "A";
  }
  if (token === "B" || token === "FIGHTER_B" || token === "CHARACTER_B") {
    return "B";
  }

  const raw = asString(value).trim().toLowerCase();
  const match = fighters.find((fighter) => {
    const name = asString(fighter.name).toLowerCase();
    return name && raw.includes(name);
  });

  const side = asString(match?.side);
  return side === "A" || side === "B" ? side : fallback;
}

export function normalizeSource(value: unknown): Record<string, unknown> {
  const source = asRecord(value);

  return {
    type: pickEnum(source.type, SOURCE_TYPE_VALUES, "UNKNOWN", {
      OFFICIAL: "CANON",
      PRIMARY: "CANON",
      FANDOM_PAGE: "FANDOM",
      NONE: "N_A",
      NA: "N_A",
    }),
    ref: asString(
      source.ref || source.reference,
      "Source requires verification",
    ),
    status: pickEnum(
      source.status,
      SOURCE_STATUS_VALUES,
      "REQUIRES_VERIFICATION",
      {
        VALID: "VERIFIED",
        CONFIRMED: "VERIFIED",
        UNKNOWN: "REQUIRES_VERIFICATION",
        NEEDS_SOURCE: "REQUIRES_VERIFICATION",
      },
    ),
    reliability: pickEnum(
      source.reliability,
      SOURCE_RELIABILITY_VALUES,
      "UNKNOWN",
      {
        EXTRACTED: "EXTRACTED_PAGE",
        PAGE: "EXTRACTED_PAGE",
      },
    ),
    note: asString(source.note || source.notes),
  };
}

export function normalizeClaim(
  value: unknown,
  index: number,
): Record<string, unknown> {
  const claim = asRecord(value);
  const source = claim.source || {
    type: claim.source_type,
    ref: claim.source_ref || claim.ref || claim.reference,
    status: claim.source_status,
    reliability: claim.source_reliability,
    note: claim.source_note,
  };

  const kind = pickEnum(claim.kind, CLAIM_KIND_VALUES, "INTERPRETATION", {
    HAX: "ABILITY",
    FEAT: "DIRECT_FEAT",
    DIRECT: "DIRECT_FEAT",
    DIRECTFEAT: "DIRECT_FEAT",
    ANTI: "ANTI_FEAT",
    SUBJECTIVE: "SUBJECTIVE_REASON",
  });

  const category = pickEnum(claim.category, CATEGORY_VALUES, "DATA_QUALITY", {
    HAX: "ABILITY",
    SOURCE: "DATA_QUALITY",
  });

  return {
    id: asString(claim.id, `claim_${index + 1}`),
    side: pickEnum(claim.side, ["A", "B", "BOTH", "SYSTEM"] as const, "SYSTEM"),
    kind,
    tag: pickEnum(claim.tag, CLAIM_TAG_VALUES, "INTERPRETATION", {
      HAX: "INTERPRETATION",
      FEAT: "DIRECT",
      DIRECT_FEAT: "DIRECT",
      ANTI: "ANTI_FEAT",
    }),
    category,
    text: asString(
      claim.text || claim.claim_text || claim.claim || claim.summary,
    ),
    source: normalizeSource(source),
    evidence_level: pickEnum(
      claim.evidence_level,
      EVIDENCE_LEVEL_VALUES,
      "UNKNOWN",
      {
        SCALING: "STRONG_SCALING",
        STRONG: "STRONG_SCALING",
        WEAK: "WEAK_SCALING",
        CALC: "CALC_BASED",
        STATEMENT: "STATEMENT_BASED",
        CONSENSUS: "CONSENSUS_ONLY",
      },
    ),
    importance: pickEnum(claim.importance, IMPORTANCE_VALUES, "MEDIUM"),
    confidence: clampInt(claim.confidence, 1, 100, 50),
    supports_verdict: asBoolean(claim.supports_verdict, false),
    review_flag: pickEnum(claim.review_flag, REVIEW_FLAG_VALUES, "OK", {
      NEEDS_REVIEW: "NEEDS_SOURCE",
      SOURCE_NEEDED: "NEEDS_SOURCE",
      BAD_SCALING: "BAD_SCALING_RISK",
      MECHANICS: "MECHANICS_MISMATCH",
    }),
    contested: asBoolean(claim.contested || claim.is_contested, false),
    outlier: asBoolean(claim.outlier, false),
    appeal_hint: asString(claim.appeal_hint),
  };
}

export function normalizeFighter(
  value: unknown,
  fallbackSide: "A" | "B",
  context: CoerceBattleDraftContext,
): Record<string, unknown> {
  const fighter = asRecord(value);
  const profile = asRecord(fighter.profile);
  const origin = asRecord(fighter.origin);
  const tier = asRecord(fighter.tier);
  const tierRating =
    typeof fighter.tier === "string"
      ? fighter.tier
      : tier.rating || tier.value || fighter.tier_rating;
  const fallbackName =
    fallbackSide === "A" ? context.fighterA : context.fighterB;
  const fallbackVersion =
    fallbackSide === "A"
      ? context.characterAVersion
      : context.characterBVersion;
  const name = asString(
    fighter.name || fighter.character || fighter.character_name || profile.name,
    fallbackName || `Fighter ${fallbackSide}`,
  );
  const version = asString(
    fighter.version || fighter.form || fighter.continuity || origin.continuity,
    fallbackVersion || "Standard version",
  );
  const verse = asString(
    fighter.verse || fighter.series || fighter.franchise || origin.full_title,
    "Unknown verse",
  );

  return {
    side: pickEnum(fighter.side, SIDE_VALUES, fallbackSide),
    name,
    version,
    verse,
    origin: {
      full_title: asString(
        origin.full_title || fighter.full_title || verse,
        verse,
      ),
      abbreviation: asString(origin.abbreviation),
      continuity: asString(origin.continuity || version, version),
      data_source: pickEnum(
        origin.data_source,
        DATA_PROVENANCE_VALUES,
        "MODEL_INFERRED",
      ),
      source_note: asString(origin.source_note || fighter.source_note),
    },
    tier: {
      rating: asString(tierRating, "Unknown"),
      basis: asString(tier.basis || tier.tier_notes || fighter.tier_basis),
      contested: asBoolean(
        tier.contested || tier.is_contested || fighter.tier_contested,
        false,
      ),
      claim_ids: asStringArray(tier.claim_ids || fighter.tier_claim_ids),
    },
    profile: {
      ap: asString(profile.ap || fighter.ap || fighter.attack_potency),
      durability: asString(profile.durability || fighter.durability),
      speed: asString(profile.speed || fighter.speed),
      stamina: asString(profile.stamina || fighter.stamina, "Unknown"),
      abilities: Array.isArray(profile.abilities)
        ? asStringArray(profile.abilities).join(", ")
        : asString(
            profile.abilities ||
              profile.hax ||
              profile.hax_and_resistances ||
              fighter.abilities,
          ),
      resistances: Array.isArray(profile.resistances)
        ? asStringArray(profile.resistances).join(", ")
        : asString(
            profile.resistances ||
              profile.resistance ||
              profile.hax_and_resistances ||
              fighter.resistances ||
              fighter.resistance,
          ),
      skill: asString(profile.skill || fighter.skill),
      weaknesses: asStringArray(profile.weaknesses || fighter.weaknesses).slice(
        0,
        6,
      ),
      win_conditions: asStringArray(
        profile.win_conditions || fighter.win_conditions,
      )
        .map((item, index) => {
          const winCondition = asRecord(
            asArray(profile.win_conditions || fighter.win_conditions)[index],
          );
          return asString(winCondition.method, item);
        })
        .slice(0, 5),
      lose_conditions: asStringArray(
        profile.lose_conditions || fighter.lose_conditions,
      ).slice(0, 5),
      counters: asStringArray(profile.counters || fighter.counters).slice(0, 5),
    },
    best_argument: asString(fighter.best_argument),
    weakest_argument: asString(fighter.weakest_argument),
  };
}

export function normalizeCoreStats(
  value: unknown,
): Array<"AP" | "DURABILITY" | "SPEED" | "STAMINA"> {
  const normalized = asStringArray(value).map((item) =>
    pickEnum(item, ["AP", "DURABILITY", "SPEED", "STAMINA"] as const, "AP", {
      ATTACK_POTENCY: "AP",
      ATTACK: "AP",
      POWER: "AP",
      DEFENSE: "DURABILITY",
      DURABILITY: "DURABILITY",
      VELOCITY: "SPEED",
      ENDURANCE: "STAMINA",
    }),
  );

  const deduped = Array.from(new Set(normalized));
  const defaults: Array<"AP" | "DURABILITY" | "SPEED" | "STAMINA"> = [
    "AP",
    "DURABILITY",
    "SPEED",
    "STAMINA",
  ];

  for (const item of defaults) {
    if (deduped.length >= 3) break;
    if (!deduped.includes(item)) deduped.push(item);
  }

  return deduped.slice(0, 4);
}

export function isWeakAppealNeeded(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length < 12 ||
    ["true", "false", "yes", "no", "none"].includes(normalized)
  );
}

export function normalizeAppeal(
  value: unknown,
  index: number,
): Record<string, unknown> {
  const appeal = asRecord(value);
  const needed = asString(appeal.needed);

  return {
    reason: pickEnum(appeal.reason, APPEAL_REASON_VALUES, "OTHER"),
    target_ids: asStringArray(appeal.target_ids || appeal.claim_ids).slice(
      0,
      6,
    ),
    summary: asString(appeal.summary, `Appeal point ${index + 1}`),
    needed: isWeakAppealNeeded(needed)
      ? "Provide exact primary references, accepted profile sections, or accepted calculations for the targeted claims."
      : needed,
  };
}

export function looksLikeAbilityWinCondition(value: string): boolean {
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

export function normalizeDifficulty(
  value: unknown,
): (typeof DIFFICULTY_VALUES)[number] {
  const raw = asString(value);
  const token = normalizeToken(raw);
  const aliases: Record<string, (typeof DIFFICULTY_VALUES)[number]> = {
    EASY: "LOW_DIFF",
    EASY_DIFFICULTY: "LOW_DIFF",
    LOW: "LOW_DIFF",
    LOW_DIFFICULTY: "LOW_DIFF",
    MID: "MID_DIFF",
    MEDIUM: "MID_DIFF",
    MEDIUM_DIFFICULTY: "MID_DIFF",
    HARD: "HIGH_DIFF",
    HIGH: "HIGH_DIFF",
    HIGH_DIFFICULTY: "HIGH_DIFF",
    VERY_HARD: "EXTREME_DIFF",
    EXTREME: "EXTREME_DIFF",
    EXTREME_DIFFICULTY: "EXTREME_DIFF",
    NO: "NO_DIFF",
    NO_DIFFICULTY: "NO_DIFF",
    NEGATIVE_DIFFICULTY: "NO_DIFF",
    STOMP_WIN: "STOMP",
    STOMPED: "STOMP",
    ROUGHLY_EQUAL: "INCONCLUSIVE",
    UNKNOWN: "INCONCLUSIVE",
  };

  if (aliases[token]) return aliases[token];
  if (token.includes("STOMP") || token.includes("CURB_STOMP")) return "STOMP";
  if (
    token.includes("NO_DIFF") ||
    token.includes("NO_DIFFICULTY") ||
    token.includes("NEGATIVE_DIFFICULTY") ||
    token.includes("EFFORTLESS")
  ) {
    return "NO_DIFF";
  }
  if (
    token.includes("EASY") ||
    token.includes("LOW_DIFF") ||
    token === "LOW" ||
    token.includes("LOW_DIFFICULTY")
  ) {
    return "LOW_DIFF";
  }
  if (
    token.includes("MID_DIFF") ||
    token === "MID" ||
    token.includes("MEDIUM_DIFFICULTY") ||
    token === "MEDIUM"
  ) {
    return "MID_DIFF";
  }
  if (token.includes("VERY_HARD") || token.includes("EXTREME")) {
    return "EXTREME_DIFF";
  }
  if (
    token.includes("HIGH_DIFF") ||
    token === "HIGH" ||
    token.includes("HARD") ||
    token.includes("HIGH_DIFFICULTY")
  ) {
    return "HIGH_DIFF";
  }
  if (
    token.includes("INCONCLUSIVE") ||
    token.includes("UNDECIDED") ||
    token.includes("ROUGHLY_EQUAL") ||
    token.includes("UNKNOWN")
  ) {
    return "INCONCLUSIVE";
  }

  return pickEnum(value, DIFFICULTY_VALUES, "INCONCLUSIVE", aliases);
}

export function ensureMinStringArray(
  values: string[],
  fallbacks: string[],
  minItems: number,
  maxItems: number,
): string[] {
  const items = Array.from(new Set(values.filter(Boolean))).slice(0, maxItems);

  for (const fallback of fallbacks) {
    if (items.length >= minItems) break;
    if (fallback && !items.includes(fallback)) items.push(fallback);
  }

  while (items.length < minItems) {
    items.push(
      "Model output omitted a required factor; manual review is recommended.",
    );
  }

  return items.slice(0, maxItems);
}

export function warningMatches(warnings: string[], pattern: RegExp): boolean {
  return warnings.some((warning) => pattern.test(warning));
}
