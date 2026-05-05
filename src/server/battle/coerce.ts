import { SCHEMA_VERSION, type OmniversusBattle } from "./schema";

type CoerceBattleDraftContext = {
  fighterA?: string;
  fighterB?: string;
  characterAVersion?: string;
  characterBVersion?: string;
};

export function clampConfidenceBand(
  score: number,
): OmniversusBattle["verdict"]["confidence_band"] {
  if (score >= 80) return "DOMINANT_80_100";
  if (score >= 65) return "CONFIDENT_65_79";
  if (score >= 50) return "CONTESTED_50_64";
  return "INDETERMINATE_1_49";
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

export function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function isPlaceholderArrayItem(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ["none", "n/a", "na", "n_a", "unknown", "null"].includes(normalized);
}

export function asStringArray(value: unknown): string[] {
  return asArray(value)
    .map((item) => asString(item))
    .filter((item) => item && !isPlaceholderArrayItem(item));
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(normalized)) return true;
    if (["false", "no", "0"].includes(normalized)) return false;
  }

  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const numeric = Number(value.replace("%", "").trim());
    if (Number.isFinite(numeric)) return numeric;
  }

  return fallback;
}

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const numeric = Math.round(asNumber(value, fallback));
  return Math.max(min, Math.min(max, numeric));
}

function normalizeToken(value: unknown): string {
  return asString(value)
    .trim()
    .replace(/[\[\]]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function pickEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
  aliases: Record<string, T[number]> = {},
): T[number] {
  const raw = asString(value).trim();

  if (allowed.includes(raw as T[number])) {
    return raw as T[number];
  }

  const lower = raw.toLowerCase();
  if (allowed.includes(lower as T[number])) {
    return lower as T[number];
  }

  const token = normalizeToken(value);
  return (
    aliases[token] ??
    (allowed.includes(token as T[number]) ? (token as T[number]) : fallback)
  );
}

const SIDE_VALUES = ["A", "B"] as const;
const SIDE_RESULT_VALUES = ["A", "B", "DRAW", "INCONCLUSIVE"] as const;
const SIDE_OR_TIE_VALUES = ["A", "B", "TIE", "INCONCLUSIVE"] as const;

const DATA_PROVENANCE_VALUES = [
  "MANUAL",
  "EXTRACTED_FANDOM",
  "EXTRACTED_VSBW",
  "MIXED",
  "MODEL_INFERRED",
  "UNKNOWN",
] as const;

const CLAIM_KIND_VALUES = [
  "DIRECT_FEAT",
  "SCALING",
  "CALC",
  "STATEMENT",
  "INTERPRETATION",
  "ANTI_FEAT",
  "ABILITY",
  "RESISTANCE",
  "WEAKNESS",
  "SUBJECTIVE_REASON",
  "DATA_QUALITY",
] as const;

const CLAIM_TAG_VALUES = [
  "DIRECT",
  "SCALING",
  "CALC",
  "STATEMENT",
  "INTERPRETATION",
  "ANTI_FEAT",
] as const;

const CATEGORY_VALUES = [
  "AP",
  "DURABILITY",
  "SPEED",
  "RANGE",
  "STAMINA",
  "SKILL",
  "INTELLIGENCE",
  "ABILITY",
  "RESISTANCE",
  "WEAKNESS",
  "WIN_CONDITION",
  "CONSENSUS",
  "CULTURAL_WEIGHT",
  "DESIGN",
  "POPULARITY",
  "DATA_QUALITY",
] as const;

const COMPARISON_CATEGORY_VALUES = [
  "AP",
  "DURABILITY",
  "SPEED",
  "RANGE",
  "STAMINA",
  "SKILL",
  "INTELLIGENCE",
  "ABILITY",
  "RESISTANCE",
  "WIN_CONDITION",
  "CONSENSUS",
  "CULTURAL_WEIGHT",
  "DESIGN",
  "POPULARITY",
] as const;

const SOURCE_TYPE_VALUES = [
  "CANON",
  "VSBW",
  "CALC",
  "CONSENSUS",
  "WIKI",
  "FANDOM",
  "UNKNOWN",
  "N_A",
] as const;

const SOURCE_STATUS_VALUES = [
  "VERIFIED",
  "ACCEPTED",
  "REQUIRES_VERIFICATION",
  "CONTESTED",
  "REJECTED",
  "NOT_REQUIRED",
] as const;

const SOURCE_RELIABILITY_VALUES = [
  "PRIMARY",
  "SECONDARY",
  "COMMUNITY",
  "EXTRACTED_PAGE",
  "UNKNOWN",
  "N_A",
] as const;

const EVIDENCE_LEVEL_VALUES = [
  "DIRECT",
  "STRONG_SCALING",
  "WEAK_SCALING",
  "CALC_BASED",
  "STATEMENT_BASED",
  "INTERPRETATION",
  "CONSENSUS_ONLY",
  "UNKNOWN",
] as const;

const IMPORTANCE_VALUES = ["LOW", "MEDIUM", "HIGH", "DECISIVE"] as const;

const REVIEW_FLAG_VALUES = [
  "OK",
  "NEEDS_SOURCE",
  "POSSIBLE_OUTLIER",
  "BAD_SCALING_RISK",
  "CALC_DISPUTE",
  "MECHANICS_MISMATCH",
  "DATA_INPUT_RISK",
  "SUBJECTIVE_ONLY",
] as const;

const RULE_IMPACT_VALUES = [
  "NONE",
  "MINOR",
  "IMPORTANT",
  "MATCH_DECIDING",
] as const;

const NUMERICAL_STATS_ROLE_VALUES = ["NONE", "SECONDARY", "PRIMARY"] as const;

const CHAIN_TYPE_VALUES = [
  "STAT_ADVANTAGE",
  "ABILITY_INTERACTION",
  "RESISTANCE_CHECK",
  "WIN_CONDITION",
  "ANTI_ARGUMENT",
  "DATA_QUALITY",
  "SUBJECTIVE_REASONING",
] as const;

const PREMISE_ROLE_VALUES = [
  "FACT",
  "SCALING_LINK",
  "RULE",
  "ASSUMPTION",
  "ABILITY_MECHANIC",
  "RESISTANCE_CHECK",
  "COUNTERPOINT",
] as const;

const ABILITY_TYPE_VALUES = [
  "DAMAGE",
  "DEFENSE",
  "BFR",
  "SEALING",
  "MIND",
  "SOUL",
  "DOMAIN",
  "CONTRACT",
  "CONCEPTUAL",
  "CAUSALITY",
  "TIME",
  "SPACE",
  "PASSIVE",
  "UTILITY",
  "OTHER",
] as const;

const IMPACT_VALUES = ["NONE", "MINOR", "MAJOR", "WIN_CONDITION"] as const;

const WIN_TYPE_VALUES = [
  "STAT_CHECK",
  "ABILITY",
  "BFR",
  "INCAP",
  "KO",
  "DEATH",
  "STAMINA",
  "SKILL",
  "SUBJECTIVE_EDGE",
] as const;

const PROBABILITY_VALUES = [
  "VERY_LOW",
  "LOW",
  "MEDIUM",
  "HIGH",
  "VERY_HIGH",
] as const;

const DIFFICULTY_VALUES = [
  "NO_DIFF",
  "LOW_DIFF",
  "MID_DIFF",
  "HIGH_DIFF",
  "EXTREME_DIFF",
  "STOMP",
  "INCONCLUSIVE",
] as const;

const CONFIDENCE_BAND_VALUES = [
  "DOMINANT_80_100",
  "CONFIDENT_65_79",
  "CONTESTED_50_64",
  "INDETERMINATE_1_49",
] as const;

const CARD_VARIANT_VALUES = [
  "STOMP",
  "CLOSE_MATCH",
  "CONTROVERSIAL",
  "SUBJECTIVE",
  "INCONCLUSIVE",
] as const;

const APPEAL_REASON_VALUES = [
  "WRONG_SOURCE",
  "WRONG_CANON_SCOPE",
  "OUTLIER",
  "BAD_SCALING",
  "CALC_DISPUTE",
  "MISTRANSLATION",
  "MECHANICS_MISMATCH",
  "MISSING_RESISTANCE",
  "DATA_INPUT_ERROR",
  "CHAIN_GAP",
  "SUBJECTIVE_CONSENSUS_DISPUTE",
  "CULTURAL_WEIGHT_DISPUTE",
  "OTHER",
] as const;

function normalizeSide(
  value: unknown,
  fighters: Array<Record<string, unknown>>,
  fallback: "A" | "B",
): "A" | "B" {
  const token = normalizeToken(value);
  if (token === "A" || token === "FIGHTER_A" || token === "CHARACTER_A")
    return "A";
  if (token === "B" || token === "FIGHTER_B" || token === "CHARACTER_B")
    return "B";

  const raw = asString(value).trim().toLowerCase();
  const match = fighters.find((fighter) => {
    const name = asString(fighter.name).toLowerCase();
    return name && raw.includes(name);
  });

  const side = asString(match?.side);
  return side === "A" || side === "B" ? side : fallback;
}

function normalizeSource(value: unknown): Record<string, unknown> {
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

function normalizeClaim(
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

function normalizeFighter(
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

function normalizeCoreStats(
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

function normalizeAppeal(
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

function normalizeDifficulty(
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

function ensureMinStringArray(
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

function warningMatches(warnings: string[], pattern: RegExp): boolean {
  return warnings.some((warning) => pattern.test(warning));
}

export function coerceBattleDraft(
  raw: unknown,
  context: CoerceBattleDraftContext = {},
): unknown {
  const draft = asRecord(raw);
  const battleContext = asRecord(draft.battle_context);
  const environment = asRecord(draft.environment);
  const dataQualityWarnings = asRecord(draft.data_quality_warnings);
  const metadata = asRecord(
    draft.metadata || {
      battle_type: "OBJECTIVE",
      language: "en",
      title: battleContext.title,
      canon_scope: "PRIMARY_CANON",
      speed_equalized: battleContext.speed_equalized,
      assumptions: battleContext.assumptions,
      data_provenance_mode: "MODEL_INFERRED",
      source_summary:
        "Structured battle draft generated from model-inferred knowledge.",
      input_risks: [
        dataQualityWarnings.most_fragile_assumption,
        dataQualityWarnings.potential_appeal_reason,
      ].filter(Boolean),
    },
  );
  const dataProvenance = asRecord(draft.data_provenance);
  const rules = asRecord(
    draft.rules || {
      assumption_set: "VSBW_SBA",
      location: environment.location,
      starting_distance: environment.starting_distance,
      prep_time: environment.prep_time,
      prior_knowledge: environment.prior_knowledge,
      equipment: "standard equipment",
      verse_equalization: "reasonable interaction only; no new resistances",
      speed_equalized: battleContext.speed_equalized,
      rule_impact:
        environment.tactical_advantage === "NEUTRAL" ? "MINOR" : "IMPORTANT",
      rule_notes: environment.environmental_notes,
    },
  );
  const statModel = asRecord(draft.stat_model);
  const audit = asRecord(draft.audit);
  const qualityFlags = asRecord(
    draft.quality_flags || {
      has_contested_scaling: dataQualityWarnings.has_contested_scaling,
      has_possible_outliers: dataQualityWarnings.has_possible_outliers,
      has_unverified_sources: true,
      has_mechanics_mismatch:
        dataQualityWarnings.potential_appeal_reason === "MECHANICS_MISMATCH" ||
        dataQualityWarnings.potential_appeal_reason === "MISSING_RESISTANCE",
      has_confidence_cap:
        dataQualityWarnings.potential_appeal_reason &&
        dataQualityWarnings.potential_appeal_reason !== "NONE",
      has_data_input_warning: true,
      has_chain_gap: false,
      most_fragile_assumption: dataQualityWarnings.most_fragile_assumption,
    },
  );

  const rawFighters = asArray(draft.fighters).map(asRecord);
  const fighters = [
    normalizeFighter(rawFighters[0] ?? { side: "A" }, "A", context),
    normalizeFighter(rawFighters[1] ?? { side: "B" }, "B", context),
  ];

  let claims = asArray(draft.claims || draft.evidence_and_claims)
    .map((claim, index) => normalizeClaim(claim, index))
    .slice(0, 14);

  if (claims.length < 2) {
    claims = [
      ...claims,
      normalizeClaim(
        {
          id: "auto_data_quality",
          side: "SYSTEM",
          kind: "DATA_QUALITY",
          tag: "INTERPRETATION",
          category: "DATA_QUALITY",
          text: "Model output did not provide enough claims; manual review is required.",
          source: { type: "UNKNOWN", ref: "Source requires verification" },
          evidence_level: "UNKNOWN",
          importance: "HIGH",
          confidence: 50,
          supports_verdict: false,
          review_flag: "DATA_INPUT_RISK",
          contested: true,
          outlier: false,
          appeal_hint: "Add source-backed claims.",
        },
        claims.length,
      ),
      normalizeClaim(
        {
          id: "auto_missing_claim",
          side: "SYSTEM",
          kind: "INTERPRETATION",
          tag: "INTERPRETATION",
          category: "DATA_QUALITY",
          text: "A second fallback claim was added so the report can be validated.",
          source: { type: "UNKNOWN", ref: "Source requires verification" },
          evidence_level: "UNKNOWN",
          importance: "MEDIUM",
          confidence: 50,
          supports_verdict: false,
          review_flag: "DATA_INPUT_RISK",
          contested: true,
          outlier: false,
          appeal_hint: "Replace fallback claim with actual evidence.",
        },
        claims.length + 1,
      ),
    ].slice(0, 2);
  }

  let argumentChains = asArray(draft.argument_chains || draft.logical_arguments)
    .map((value, index) => {
      const chain = asRecord(value);
      const premiseClaimIds = asStringArray(
        chain.premise_claim_ids || chain.claim_ids || chain.linked_claim_ids,
      );
      const premiseTexts = asStringArray(chain.premise_texts);
      const rawPremiseValues = asArray(chain.premises);
      const compactPremiseValues =
        rawPremiseValues.length > 0
          ? rawPremiseValues
          : premiseTexts.length > 0
            ? premiseTexts.map((text, premiseIndex) => ({
                text,
                claim_id: premiseClaimIds[premiseIndex],
              }))
            : [
                {
                  role: "FACT",
                  text: chain.premise,
                  claim_id: premiseClaimIds[0],
                },
                {
                  role: "COUNTERPOINT",
                  text: chain.counter_argument,
                  claim_id: premiseClaimIds[1],
                },
                {
                  role: "RULE",
                  text: chain.rebuttal,
                  claim_id: premiseClaimIds[2],
                },
              ];

      const premises = compactPremiseValues
        .map((premiseValue, premiseIndex) => {
          const premise = asRecord(premiseValue);
          const compactText =
            typeof premiseValue === "string" ? premiseValue : undefined;

          return {
            id: asString(premise.id, `p${index + 1}_${premiseIndex + 1}`),
            role: pickEnum(premise.role, PREMISE_ROLE_VALUES, "FACT", {
              SOURCE: "FACT",
              CLAIM: "FACT",
              STAT: "FACT",
              ABILITY: "ABILITY_MECHANIC",
              HAX: "ABILITY_MECHANIC",
              RESISTANCE: "RESISTANCE_CHECK",
              COUNTER: "COUNTERPOINT",
            }),
            claim_id: asString(
              premise.claim_id || premiseClaimIds[premiseIndex],
              "N_A",
            ),
            text: asString(premise.text || compactText),
            contested: asBoolean(premise.contested, false),
          };
        })
        .slice(0, 6);

      while (premises.length < 2) {
        premises.push({
          id: `p${index + 1}_${premises.length + 1}`,
          role: premises.length === 0 ? "FACT" : "RULE",
          claim_id:
            premises.length === 0 ? asString(claims[0]?.id, "N_A") : "N_A",
          text:
            premises.length === 0
              ? "Fallback premise from available claims."
              : "Fallback rule premise; manual review recommended.",
          contested: true,
        });
      }

      return {
        id: asString(chain.id, `chain_${index + 1}`),
        side: pickEnum(
          chain.side || chain.side_supported,
          ["A", "B", "BOTH", "SYSTEM"] as const,
          "SYSTEM",
        ),
        chain_type: pickEnum(
          chain.chain_type,
          CHAIN_TYPE_VALUES,
          "WIN_CONDITION",
          {
            STAT: "STAT_ADVANTAGE",
            STATS: "STAT_ADVANTAGE",
            HAX: "ABILITY_INTERACTION",
            ABILITY: "ABILITY_INTERACTION",
            RESISTANCE: "RESISTANCE_CHECK",
            WIN: "WIN_CONDITION",
            COUNTER: "ANTI_ARGUMENT",
          },
        ),
        title: asString(chain.title, `Argument Chain ${index + 1}`),
        conclusion: asString(chain.conclusion),
        premises,
        inference_rule: asString(
          chain.inference_rule || chain.rebuttal,
          "If the premises hold, the conclusion follows for this matchup.",
        ),
        inference: asString(
          chain.inference || chain.rebuttal,
          asString(chain.conclusion),
        ),
        confidence: clampInt(chain.confidence, 1, 100, 50),
        contested: asBoolean(chain.contested, false),
        breaks_if: asString(chain.breaks_if),
        linked_claim_ids: asStringArray(
          chain.linked_claim_ids || chain.claim_ids || chain.premise_claim_ids,
        ),
      };
    })
    .slice(0, 8);

  if (argumentChains.length < 2) {
    const rawVerdict = asRecord(draft.verdict);
    const likelyWinnerSide = pickEnum(
      rawVerdict.winner_side,
      SIDE_RESULT_VALUES,
      "INCONCLUSIVE",
    );
    const winnerSide: "A" | "B" | "SYSTEM" =
      likelyWinnerSide === "A" || likelyWinnerSide === "B"
        ? likelyWinnerSide
        : "SYSTEM";
    const losingSide: "A" | "B" | "SYSTEM" =
      likelyWinnerSide === "A"
        ? "B"
        : likelyWinnerSide === "B"
          ? "A"
          : "SYSTEM";

    const hasWinnerChain =
      likelyWinnerSide === "A" || likelyWinnerSide === "B"
        ? argumentChains.some(
            (chain) =>
              chain.side === likelyWinnerSide &&
              (chain.chain_type === "WIN_CONDITION" ||
                chain.chain_type === "STAT_ADVANTAGE" ||
                chain.chain_type === "ABILITY_INTERACTION"),
          )
        : false;
    const hasLosingSideChain =
      losingSide === "A" || losingSide === "B"
        ? argumentChains.some((chain) => chain.side === losingSide)
        : false;

    const fallbackChains: typeof argumentChains = [];

    if (!hasWinnerChain) {
      fallbackChains.push({
        id: "auto_winner_chain",
        side: winnerSide,
        chain_type: "WIN_CONDITION",
        title: "Fallback winner chain",
        conclusion: "The predicted winner needs a stronger generated chain.",
        premises: [
          {
            id: "auto_p1",
            role: "FACT",
            claim_id: asString(claims[0]?.id, "N_A"),
            text: "At least one relevant winner-side claim exists.",
            contested: true,
          },
          {
            id: "auto_p2",
            role: "RULE",
            claim_id: "N_A",
            text: "A verdict requires a claim-to-win-condition inference.",
            contested: true,
          },
        ],
        inference_rule:
          "If the winner-side claim is valid and the opponent has no reliable counter-chain, the verdict may hold.",
        inference:
          "The report can render, but the decisive winner chain needs repair-pass improvement.",
        confidence: 50,
        contested: true,
        breaks_if: "A proper source-backed winner chain is generated.",
        linked_claim_ids: [asString(claims[0]?.id, "N_A")],
      });
    }

    if (!hasLosingSideChain) {
      fallbackChains.push({
        id: `auto_${losingSide}_anti_chain`,
        side: losingSide,
        chain_type: "ANTI_ARGUMENT",
        title: "Fallback losing-side anti-argument",
        conclusion:
          "The losing side needs an explicit theoretical route, even if it is very unlikely.",
        premises: [
          {
            id: "auto_p3",
            role: "COUNTERPOINT",
            claim_id: asString(claims[1]?.id, "N_A"),
            text: "The losing side may have a theoretical counterargument or special ability route.",
            contested: true,
          },
          {
            id: "auto_p4",
            role: "RULE",
            claim_id: "N_A",
            text: "Debate quality improves when both sides have explicit routes.",
            contested: true,
          },
        ],
        inference_rule:
          "If the losing side has no structured route, add a reviewable anti-argument rather than pretending no debate exists.",
        inference:
          "The output needs a stronger losing-side chain, but the page can still render.",
        confidence: 40,
        contested: true,
        breaks_if: "A source-backed losing-side win route is generated.",
        linked_claim_ids: [asString(claims[1]?.id, "N_A")],
      });
    }

    argumentChains = [...argumentChains, ...fallbackChains].slice(0, 8);
  }

  const comparison = asArray(draft.comparison)
    .map((value) => {
      const row = asRecord(value);

      return {
        category: pickEnum(
          row.category,
          COMPARISON_CATEGORY_VALUES,
          "WIN_CONDITION",
          {
            AP_AND_DURABILITY: "AP",
            SKILL_AND_EXPERIENCE: "SKILL",
            ABILITIES_AND_HAX: "ABILITY",
            HAX: "ABILITY",
          },
        ),
        winner: pickEnum(row.winner, SIDE_OR_TIE_VALUES, "INCONCLUSIVE", {
          DRAW: "TIE",
          EVEN: "TIE",
          NONE: "INCONCLUSIVE",
        }),
        margin: pickEnum(
          row.margin,
          ["NONE", "SMALL", "MEDIUM", "LARGE", "DECISIVE"] as const,
          "MEDIUM",
          {
            MARGINAL: "SMALL",
            MODERATE: "MEDIUM",
            SIGNIFICANT: "LARGE",
            INSURMOUNTABLE: "DECISIVE",
          },
        ),
        reason: asString(row.reason || row.note),
        claim_ids: asStringArray(row.claim_ids),
        contested: asBoolean(row.contested, false),
      };
    })
    .slice(0, 10);

  while (comparison.length < 3) {
    comparison.push({
      category:
        (["AP", "SPEED", "WIN_CONDITION"] as const)[comparison.length] ??
        "WIN_CONDITION",
      winner: "INCONCLUSIVE",
      margin: "NONE",
      reason: "Fallback comparison row; model output needs improvement.",
      claim_ids: [],
      contested: true,
    });
  }

  const abilityInteractions = asArray(draft.ability_interactions || draft.hax)
    .map((value, index) => {
      const row = asRecord(value);
      const effectiveToken = normalizeToken(row.effective ?? row.is_effective);

      return {
        id: asString(row.id, `ability_${index + 1}`),
        attacker: normalizeSide(row.attacker, fighters, "A"),
        defender: normalizeSide(row.defender, fighters, "B"),
        ability: asString(row.ability || row.attacker_hax),
        ability_type: pickEnum(row.ability_type, ABILITY_TYPE_VALUES, "OTHER", {
          HAX: "OTHER",
          DOMAIN_EXPANSION: "DOMAIN",
        }),
        activation: asString(row.activation),
        range: asString(row.range),
        timing: asString(row.timing),
        target_requirement: asString(row.target_requirement),
        defender_resistance: asString(
          row.defender_resistance || row.resistance,
        ),
        resistance_basis: asString(row.resistance_basis),
        structurally_similar_resistance: asString(
          row.structurally_similar_resistance,
        ),
        deliverable: asBoolean(row.deliverable, true),
        effective:
          row.effective === null ||
          row.is_effective === null ||
          effectiveToken === "UNCLEAR"
            ? null
            : effectiveToken === "YES"
              ? true
              : effectiveToken === "NO"
                ? false
                : asBoolean(row.effective ?? row.is_effective, false),
        relevance_to_win_condition: asString(row.relevance_to_win_condition),
        reason: asString(row.reason),
        counterplay: asString(row.counterplay),
        contested: asBoolean(row.contested, false),
        impact: pickEnum(
          row.impact || row.verdict_impact,
          IMPACT_VALUES,
          "NONE",
          {
            MAJOR_WIN: "WIN_CONDITION",
            PRIMARY_WIN_CONDITION: "WIN_CONDITION",
          },
        ),
        claim_ids: asStringArray(
          row.claim_ids || row.source_claim_ids || row.claim_id,
        ),
        chain_ids: asStringArray(row.chain_ids),
      };
    })
    .slice(0, 8);

  const fighterWinConditions = rawFighters.flatMap((fighter, fighterIndex) => {
    const side = normalizeSide(
      fighter.side,
      fighters,
      fighterIndex === 0 ? "A" : "B",
    );

    return asArray(fighter.win_conditions).map((value, winIndex) => {
      const row = asRecord(value);

      return {
        id: `fighter_${side}_win_${winIndex + 1}`,
        side,
        method: row.method || value,
        type: row.type,
        probability: row.probability,
      };
    });
  });

  const winConditions = asArray(draft.win_conditions || fighterWinConditions)
    .map((value, index) => {
      const row = asRecord(value);
      const method = asString(row.method);
      const requires = asString(row.requires);
      const blockedBy = asString(row.blocked_by);
      const abilityRouteText = `${method} ${requires} ${blockedBy}`;
      let type = pickEnum(row.type, WIN_TYPE_VALUES, "STAT_CHECK", {
        HAX: "ABILITY",
        ABILITY_INTERACTION: "ABILITY",
      });

      if (looksLikeAbilityWinCondition(abilityRouteText)) {
        type = /bfr|banish/i.test(abilityRouteText) ? "BFR" : "ABILITY";
      }

      return {
        id: asString(row.id, `win_${index + 1}`),
        side: normalizeSide(row.side, fighters, index === 0 ? "A" : "B"),
        method,
        type,
        requires,
        blocked_by: blockedBy,
        probability: pickEnum(row.probability, PROBABILITY_VALUES, "MEDIUM"),
        claim_ids: asStringArray(row.claim_ids),
        chain_ids: asStringArray(row.chain_ids),
        contested: asBoolean(row.contested, false),
      };
    })
    .slice(0, 6);

  while (winConditions.length < 2) {
    const side = winConditions.some((item) => item.side === "A") ? "B" : "A";
    winConditions.push({
      id: `auto_${side}_win`,
      side,
      method: "Fallback win condition",
      type: "STAT_CHECK",
      requires: "A stronger generated route.",
      blocked_by: "Unknown",
      probability: "VERY_LOW",
      claim_ids: [],
      chain_ids: [],
      contested: true,
    });
  }

  const narrative = asArray(draft.narrative)
    .map((value, index) => {
      const row = asRecord(value);
      const advantage = pickEnum(
        row.advantage,
        ["A", "B", "NEUTRAL"] as const,
        "NEUTRAL",
      );
      const defaultAHp = advantage === "A" ? 75 : advantage === "B" ? 45 : 60;
      const defaultBHp = advantage === "B" ? 75 : advantage === "A" ? 45 : 60;

      return {
        step: clampInt(row.step, 1, 5, index + 1),
        title: asString(row.title, `Step ${index + 1}`),
        log: asString(row.log),
        a_hp: clampInt(row.a_hp, 0, 100, defaultAHp),
        b_hp: clampInt(row.b_hp, 0, 100, defaultBHp),
        why: asString(row.why, `Narrative advantage: ${advantage}.`),
        claim_ids: asStringArray(row.claim_ids),
        chain_ids: asStringArray(row.chain_ids),
        contested: asBoolean(row.contested, false),
      };
    })
    .slice(0, 5);

  while (narrative.length < 5) {
    const step = narrative.length + 1;
    narrative.push({
      step,
      title:
        step === 1 ? "Intro" : step === 5 ? "Conclusion" : `Act ${step - 1}`,
      log: "Fallback narrative step; model output needs improvement.",
      a_hp: 100,
      b_hp: step === 5 ? 0 : 100,
      why: "Maintains fixed five-step UI contract.",
      claim_ids: [],
      chain_ids: [],
      contested: true,
    });
  }

  const verdict = asRecord(draft.verdict);
  const ui = asRecord(draft.ui);
  const primaryReason = asString(verdict.primary_reason);
  const whyNotOtherSide = asString(verdict.why_not_other_side);
  const keyFactors = ensureMinStringArray(
    asStringArray(verdict.key_factors),
    [
      primaryReason,
      asString(argumentChains[0]?.conclusion),
      whyNotOtherSide,
      "The result depends on the generated claims, rules, and ability interactions.",
    ],
    2,
    5,
  );

  const confidenceScore = clampInt(verdict.confidence_score, 1, 100, 50);
  const provenanceMode = pickEnum(
    dataProvenance.mode || metadata.data_provenance_mode,
    DATA_PROVENANCE_VALUES,
    "MODEL_INFERRED",
  );
  const potentialAppealReason = asString(
    dataQualityWarnings.potential_appeal_reason,
  );
  const activeWarnings = asStringArray(qualityFlags.active_warnings);
  const confidenceCapReason = asString(qualityFlags.confidence_cap_reason);
  const appealDrafts = asArray(draft.appeals || draft.appeal);
  const appeals =
    appealDrafts.length > 0
      ? appealDrafts
      : potentialAppealReason && potentialAppealReason !== "NONE"
        ? [
            {
              reason: potentialAppealReason,
              target_ids: [],
              summary: asString(
                dataQualityWarnings.most_fragile_assumption,
                "The matchup has a fragile assumption that may change the verdict.",
              ),
              needed:
                "Provide exact primary references, accepted profile sections, or accepted calculations for the contested point.",
            },
          ]
        : [];

  return {
    metadata: {
      schema_version: SCHEMA_VERSION,
      ruleset: "OMNIVERSUS_VSBW_STYLE",
      battle_type: pickEnum(
        metadata.battle_type,
        ["OBJECTIVE", "SUBJECTIVE"] as const,
        "OBJECTIVE",
      ),
      language: pickEnum(metadata.language, ["en", "uk"] as const, "en"),
      title: asString(metadata.title),
      canon_scope: asString(metadata.canon_scope),
      speed_equalized: asBoolean(metadata.speed_equalized, false),
      assumptions: asString(metadata.assumptions),
    },
    data_provenance: {
      mode: provenanceMode,
      summary: asString(
        dataProvenance.summary || metadata.source_summary,
        "Structured battle draft generated from model-inferred knowledge.",
      ),
      input_risks: asStringArray(
        dataProvenance.input_risks ||
          metadata.input_risks || [
            qualityFlags.most_fragile_assumption,
            confidenceCapReason,
            ...activeWarnings,
          ],
      ).slice(0, 6),
      extraction_notes: asString(
        dataProvenance.extraction_notes || metadata.source_summary,
        "Structured battle draft generated from model-inferred knowledge.",
      ),
      needs_manual_review:
        provenanceMode === "MANUAL"
          ? asBoolean(dataProvenance.needs_manual_review, false)
          : true,
    },
    rules: {
      assumption_set: pickEnum(
        rules.assumption_set,
        ["VSBW_SBA", "CUSTOM"] as const,
        "VSBW_SBA",
      ),
      location: asString(rules.location, "Central Park, New York City"),
      starting_distance: asString(
        rules.starting_distance,
        "range-based, capped at 4 km",
      ),
      prep_time: asString(rules.prep_time, "none"),
      prior_knowledge: asString(
        rules.prior_knowledge,
        "appearance and starting direction only",
      ),
      equipment: asString(rules.equipment, "standard equipment"),
      verse_equalization: asString(
        rules.verse_equalization,
        "reasonable interaction only; no new resistances",
      ),
      speed_equalized: asBoolean(
        rules.speed_equalized,
        asBoolean(metadata.speed_equalized, false),
      ),
      rule_impact: pickEnum(rules.rule_impact, RULE_IMPACT_VALUES, "IMPORTANT"),
      rule_notes: asString(rules.rule_notes),
    },
    stat_model: {
      core_stats_used: normalizeCoreStats(statModel.core_stats_used),
      numerical_stats_role: pickEnum(
        statModel.numerical_stats_role,
        NUMERICAL_STATS_ROLE_VALUES,
        "SECONDARY",
      ),
      hax_is_not_numeric: true,
      stamina_policy: asString(statModel.stamina_policy),
      notes: asString(statModel.notes),
    },
    fighters,
    claims,
    argument_chains: argumentChains,
    comparison,
    ability_interactions: abilityInteractions,
    win_conditions: winConditions,
    audit: {
      sources: asString(audit.sources),
      data_inputs: asString(audit.data_inputs),
      canon: asString(audit.canon),
      tier_ap: asString(audit.tier_ap),
      speed: asString(audit.speed),
      ability_interactions: asString(audit.ability_interactions),
      resistances: asString(audit.resistances),
      logical_chains: asString(audit.logical_chains),
      confidence: asString(audit.confidence),
    },
    quality_flags: {
      has_unverified_sources: asBoolean(
        qualityFlags.has_unverified_sources,
        activeWarnings.length > 0,
      ),
      has_contested_scaling: asBoolean(
        qualityFlags.has_contested_scaling,
        warningMatches(activeWarnings, /scaling|tier|calc/i),
      ),
      has_possible_outliers: asBoolean(
        qualityFlags.has_possible_outliers,
        warningMatches(activeWarnings, /outlier/i),
      ),
      has_mechanics_mismatch: asBoolean(
        qualityFlags.has_mechanics_mismatch,
        warningMatches(activeWarnings, /mechanic|resistance|ability|hax/i),
      ),
      has_confidence_cap: asBoolean(
        qualityFlags.has_confidence_cap,
        Boolean(confidenceCapReason.trim() || activeWarnings.length > 0),
      ),
      has_data_input_warning: asBoolean(
        qualityFlags.has_data_input_warning,
        activeWarnings.length > 0,
      ),
      has_chain_gap: asBoolean(
        qualityFlags.has_chain_gap,
        warningMatches(activeWarnings, /chain|premise|claim|source/i),
      ),
      most_fragile_assumption: asString(qualityFlags.most_fragile_assumption),
    },
    narrative,
    appeals: appeals
      .map((appeal, index) => normalizeAppeal(appeal, index))
      .slice(0, 6),
    verdict: {
      winner_side: pickEnum(
        verdict.winner_side,
        SIDE_RESULT_VALUES,
        "INCONCLUSIVE",
      ),
      winner_name: asString(verdict.winner_name),
      difficulty: normalizeDifficulty(
        verdict.difficulty ||
          ui.verdict_stamp ||
          ui.card_variant ||
          ui.chain_teaser,
      ),
      confidence_score: confidenceScore,
      confidence_band: pickEnum(
        verdict.confidence_band,
        CONFIDENCE_BAND_VALUES,
        clampConfidenceBand(confidenceScore),
      ),
      data_confidence_score: clampInt(
        verdict.data_confidence_score,
        1,
        100,
        confidenceScore,
      ),
      data_confidence_band: pickEnum(
        verdict.data_confidence_band,
        CONFIDENCE_BAND_VALUES,
        clampConfidenceBand(confidenceScore),
      ),
      verdict_confidence_given_data_score: clampInt(
        verdict.verdict_confidence_given_data_score,
        1,
        100,
        confidenceScore,
      ),
      verdict_confidence_given_data_band: pickEnum(
        verdict.verdict_confidence_given_data_band,
        CONFIDENCE_BAND_VALUES,
        clampConfidenceBand(confidenceScore),
      ),
      verdict_confidence_robustness_score: clampInt(
        verdict.verdict_confidence_robustness_score,
        1,
        100,
        confidenceScore,
      ),
      verdict_confidence_robustness_band: pickEnum(
        verdict.verdict_confidence_robustness_band,
        CONFIDENCE_BAND_VALUES,
        clampConfidenceBand(confidenceScore),
      ),
      confidence_explanation: asString(
        verdict.confidence_explanation,
        "Data confidence and verdict confidence are separated during normalization.",
      ),
      primary_reason: primaryReason,
      decisive_chain_id: asString(
        verdict.decisive_chain_id,
        asString(argumentChains[0]?.id),
      ),
      loser_best_argument: asString(verdict.loser_best_argument),
      why_not_other_side: whyNotOtherSide,
      flip_condition: asString(verdict.flip_condition),
      key_factors: keyFactors,
      risk_factors: asStringArray(
        verdict.risk_factors ||
          [
            dataQualityWarnings.most_fragile_assumption ||
              qualityFlags.most_fragile_assumption,
            confidenceCapReason,
            ...activeWarnings,
            potentialAppealReason && potentialAppealReason !== "NONE"
              ? potentialAppealReason
              : undefined,
          ].filter(Boolean),
      ).slice(0, 5),
      recommended_rematch: asString(verdict.recommended_rematch),
      summary_3_sentences: asString(
        verdict.summary_3_sentences || verdict.summary,
      ),
    },
    ui: {
      headline: asString(
        ui.headline,
        asString(
          metadata.title,
          `${fighters[0]?.name} vs ${fighters[1]?.name}`,
        ),
      ),
      subheadline: asString(ui.subheadline, primaryReason),
      share_text: asString(
        ui.share_text,
        `${asString(verdict.winner_name, "Result")} wins: ${primaryReason}`,
      ),
      verdict_stamp: asString(
        ui.verdict_stamp,
        `${asString(verdict.winner_name, "Winner")} ${normalizeDifficulty(
          verdict.difficulty,
        )}`,
      ),
      chain_teaser: asString(
        ui.chain_teaser,
        asString(argumentChains[0]?.conclusion, primaryReason),
      ),
      tags: asStringArray(ui.tags).slice(0, 8),
      card_variant: pickEnum(
        ui.card_variant,
        CARD_VARIANT_VALUES,
        "CONTROVERSIAL",
      ),
      primary_badge: asString(ui.primary_badge),
    },
  };
}
