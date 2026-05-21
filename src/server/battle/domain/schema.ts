import { z } from "zod";

export type BattleAssumptionSet = "VSBW_SBA" | "CUSTOM";
export type CanonScope =
  | "PRIMARY_CANON"
  | "MANGA"
  | "ANIME"
  | "COMIC_MAINLINE"
  | "GAME_CANON"
  | "LIGHT_NOVEL"
  | "MOVIE"
  | "COMPOSITE"
  | "CUSTOM";
export type OutputLanguage = "en" | "uk";
export type ThinkingLevel = "low" | "medium" | "high";
export type DataProvenanceMode =
  | "MANUAL"
  | "EXTRACTED_FANDOM"
  | "EXTRACTED_VSBW"
  | "MIXED"
  | "MODEL_INFERRED"
  | "UNKNOWN";

export type RunBattleAnalysisOptions = {
  model?: string;
  temperature?: number;
  topP?: number;
  maxCompletionTokens?: number;
  canonScope?: CanonScope | string;
  assumptionSet?: BattleAssumptionSet;
  speedEqualized?: boolean;
  battleTypeHint?: "OBJECTIVE" | "SUBJECTIVE" | "AUTO";
  dataProvenanceMode?: DataProvenanceMode;
  characterAVersion?: string;
  characterBVersion?: string;
  location?: string;
  startingDistance?: string;
  prepTime?: string;
  priorKnowledge?: string;
  equipmentRules?: string;
  verseEqualization?: string;
  customRules?: string[];
  outputLanguage?: OutputLanguage;
  thinkingLevel?: ThinkingLevel;
};

export type BattleGenerationUsage = {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cached_tokens: number | null;
  reasoning_tokens: number | null;
  prompt_tokens_details: unknown | null;
  completion_tokens_details: unknown | null;
};

export type BattleGenerationMetadata = {
  provider: "gemini";
  api: "openai-compatible-chat-completions";
  requested_model: string;
  model: string | null;
  thinking_level: ThinkingLevel;
  temperature: number | null;
  top_p: number | null;
  max_completion_tokens: number | null;
  response_format: string | null;
  response_format_fallback_used: boolean;
  id: string | null;
  request_id: string | null;
  created: number | null;
  finish_reason: string | null;
  service_tier: string | null;
  system_fingerprint: string | null;
  usage: BattleGenerationUsage | null;
  content_length: number | null;
  timings: {
    started_at: string;
    completed_at: string;
    duration_ms: number;
  };
};

export const SCHEMA_VERSION = "omniversus.logic.v2";

const obj = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

export const Side = z.enum(["A", "B"]);
export const SideResult = z.enum(["A", "B", "DRAW", "INCONCLUSIVE"]);
export const SideOrTie = z.enum(["A", "B", "TIE", "INCONCLUSIVE"]);

export const DataProvenanceModeSchema = z.enum([
  "MANUAL",
  "EXTRACTED_FANDOM",
  "EXTRACTED_VSBW",
  "MIXED",
  "MODEL_INFERRED",
  "UNKNOWN",
]);

export const EvidenceLevel = z.enum([
  "DIRECT",
  "STRONG_SCALING",
  "WEAK_SCALING",
  "CALC_BASED",
  "STATEMENT_BASED",
  "INTERPRETATION",
  "CONSENSUS_ONLY",
  "UNKNOWN",
]);

export const Importance = z.enum(["LOW", "MEDIUM", "HIGH", "DECISIVE"]);

export const ReviewFlag = z.enum([
  "OK",
  "NEEDS_SOURCE",
  "POSSIBLE_OUTLIER",
  "BAD_SCALING_RISK",
  "CALC_DISPUTE",
  "MECHANICS_MISMATCH",
  "DATA_INPUT_RISK",
  "SUBJECTIVE_ONLY",
]);

export const Probability = z.enum([
  "VERY_LOW",
  "LOW",
  "MEDIUM",
  "HIGH",
  "VERY_HIGH",
]);

export const RuleImpact = z.enum([
  "NONE",
  "MINOR",
  "IMPORTANT",
  "MATCH_DECIDING",
]);

export const TierStat = z.enum(["AP", "DURABILITY", "SPEED"]);
export const OperationalTierClass = z.enum([
  "CONSISTENT",
  "HIGH_END",
  "UNKNOWN",
]);
export const EffectiveStatus = z.enum(["YES", "NO", "UNCLEAR"]);

export const SourceSchema = obj({
  type: z.enum([
    "CANON",
    "VSBW",
    "CALC",
    "CONSENSUS",
    "WIKI",
    "FANDOM",
    "UNKNOWN",
    "N_A",
  ]),
  ref: z.string(),
  status: z.enum([
    "VERIFIED",
    "ACCEPTED",
    "REQUIRES_VERIFICATION",
    "CONTESTED",
    "REJECTED",
    "NOT_REQUIRED",
  ]),
  reliability: z.enum([
    "PRIMARY",
    "SECONDARY",
    "COMMUNITY",
    "EXTRACTED_PAGE",
    "UNKNOWN",
    "N_A",
  ]),
  note: z.string(),
});

export const ClaimSchema = obj({
  id: z.string(),
  side: z.enum(["A", "B", "BOTH", "SYSTEM"]),
  kind: z.enum([
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
  ]),
  tag: z.enum([
    "DIRECT",
    "SCALING",
    "CALC",
    "STATEMENT",
    "INTERPRETATION",
    "ANTI_FEAT",
  ]),
  category: z.enum([
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
  ]),
  text: z.string(),
  source: SourceSchema,
  evidence_level: EvidenceLevel,
  importance: Importance,
  confidence: z.number().int().min(1).max(100),
  supports_verdict: z.boolean(),
  review_flag: ReviewFlag,
  contested: z.boolean(),
  outlier: z.boolean(),
  appeal_hint: z.string(),
});

export const FighterOriginSchema = obj({
  full_title: z.string(),
  abbreviation: z.string(),
  continuity: z.string(),
  data_source: DataProvenanceModeSchema,
  source_note: z.string(),
});

export const FighterSchema = obj({
  side: Side,
  name: z.string(),
  version: z.string(),
  verse: z.string(),
  origin: FighterOriginSchema,
  tier: obj({
    rating: z.string(),
    basis: z.string(),
    contested: z.boolean(),
    claim_ids: z.array(z.string()),
  }),
  profile: obj({
    ap: z.string(),
    durability: z.string(),
    speed: z.string(),
    stamina: z.string(),
    abilities: z.string(),
    resistances: z.string(),
    skill: z.string(),
    weaknesses: z.array(z.string()).max(6),
    win_conditions: z.array(z.string()).max(5),
    lose_conditions: z.array(z.string()).max(5),
    counters: z.array(z.string()).max(5),
  }),
  portrait: obj({
    approved_at: z.string(),
    data_url: z.string(),
    source_name: z.string(),
  }).optional(),
  best_argument: z.string(),
  weakest_argument: z.string(),
});

export const TierSanitizationSchema = obj({
  side: Side,
  stat: TierStat,
  consistent_tier: z.string(),
  high_end_tier: z.string(),
  highball_tier: z.string(),
  rejected_tiers: z.array(z.string()).max(5),
  operational_tier_used: z.string(),
  operational_tier_class: OperationalTierClass,
  basis_claim_ids: z.array(z.string()),
  warning: z.string(),
  contested: z.boolean(),
});

export const ComparisonSchema = obj({
  category: z.enum([
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
  ]),
  winner: SideOrTie,
  margin: z.enum(["NONE", "SMALL", "MEDIUM", "LARGE", "DECISIVE"]),
  reason: z.string(),
  claim_ids: z.array(z.string()),
  contested: z.boolean(),
});

export const AbilityInteractionSchema = obj({
  id: z.string(),
  attacker: Side,
  defender: Side,
  ability: z.string(),
  ability_type: z.enum([
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
  ]),
  activation: z.string(),
  range: z.string(),
  timing: z.string(),
  target_requirement: z.string(),
  defender_resistance: z.string(),
  resistance_basis: z.string(),
  structurally_similar_resistance: z.string(),
  deliverable: z.boolean(),
  effective: EffectiveStatus,
  relevance_to_win_condition: z.string(),
  reason: z.string(),
  counterplay: z.string(),
  contested: z.boolean(),
  impact: z.enum(["NONE", "MINOR", "MAJOR", "WIN_CONDITION"]),
  claim_ids: z.array(z.string()),
  chain_ids: z.array(z.string()),
});

export const RulesSchema = obj({
  assumption_set: z.enum(["VSBW_SBA", "CUSTOM"]),
  location: z.string(),
  starting_distance: z.string(),
  prep_time: z.string(),
  prior_knowledge: z.string(),
  equipment: z.string(),
  verse_equalization: z.string(),
  speed_equalized: z.boolean(),
  rule_impact: RuleImpact,
  rule_notes: z.string(),
});

export const DataProvenanceSchema = obj({
  mode: DataProvenanceModeSchema,
  summary: z.string(),
  input_risks: z.array(z.string()).max(6),
  extraction_notes: z.string(),
  needs_manual_review: z.boolean(),
});

export const StatModelSchema = obj({
  core_stats_used: z
    .array(z.enum(["AP", "DURABILITY", "SPEED", "STAMINA"]))
    .min(3)
    .max(4),
  numerical_stats_role: z.enum(["NONE", "SECONDARY", "PRIMARY"]),
  hax_is_not_numeric: z.boolean(),
  stamina_policy: z.string(),
  notes: z.string(),
});

export const WinConditionSchema = obj({
  id: z.string(),
  side: Side,
  method: z.string(),
  type: z.enum([
    "STAT_CHECK",
    "ABILITY",
    "BFR",
    "INCAP",
    "KO",
    "DEATH",
    "STAMINA",
    "SKILL",
    "SUBJECTIVE_EDGE",
  ]),
  requires: z.string(),
  blocked_by: z.string(),
  probability: Probability,
  claim_ids: z.array(z.string()),
  chain_ids: z.array(z.string()),
  contested: z.boolean(),
});

export const ChainPremiseSchema = obj({
  id: z.string(),
  role: z.enum([
    "FACT",
    "SCALING_LINK",
    "RULE",
    "ASSUMPTION",
    "ABILITY_MECHANIC",
    "RESISTANCE_CHECK",
    "COUNTERPOINT",
  ]),
  claim_id: z.string(),
  text: z.string(),
  contested: z.boolean(),
});

export const ArgumentChainSchema = obj({
  id: z.string(),
  side: z.enum(["A", "B", "BOTH", "SYSTEM"]),
  chain_type: z.enum([
    "STAT_ADVANTAGE",
    "ABILITY_INTERACTION",
    "RESISTANCE_CHECK",
    "WIN_CONDITION",
    "ANTI_ARGUMENT",
    "DATA_QUALITY",
    "SUBJECTIVE_REASONING",
  ]),
  title: z.string(),
  conclusion: z.string(),
  premises: z.array(ChainPremiseSchema).min(2).max(6),
  inference_rule: z.string(),
  inference: z.string(),
  confidence: z.number().int().min(1).max(100),
  contested: z.boolean(),
  breaks_if: z.string(),
  linked_claim_ids: z.array(z.string()),
});

export const QualityFlagsSchema = obj({
  has_unverified_sources: z.boolean(),
  has_contested_scaling: z.boolean(),
  has_possible_outliers: z.boolean(),
  has_mechanics_mismatch: z.boolean(),
  has_confidence_cap: z.boolean(),
  has_data_input_warning: z.boolean(),
  has_chain_gap: z.boolean(),
  active_warnings: z.array(z.string()).max(6),
  most_fragile_assumption: z.string(),
  confidence_cap_reason: z.string(),
});

export const NarrativeStepSchema = obj({
  step: z.number().int().min(1).max(5),
  title: z.string(),
  log: z.string(),
  a_hp: z.number().int().min(0).max(100),
  b_hp: z.number().int().min(0).max(100),
  why: z.string(),
  claim_ids: z.array(z.string()),
  chain_ids: z.array(z.string()),
  contested: z.boolean(),
});

export const ConfidenceBand = z.enum([
  "DOMINANT_80_100",
  "CONFIDENT_65_79",
  "CONTESTED_50_64",
  "INDETERMINATE_1_49",
]);

export const VerdictSchema = obj({
  winner_side: SideResult,
  winner_name: z.string(),
  difficulty: z.enum([
    "NO_DIFF",
    "LOW_DIFF",
    "MID_DIFF",
    "HIGH_DIFF",
    "EXTREME_DIFF",
    "STOMP",
    "INCONCLUSIVE",
  ]),
  confidence_score: z.number().int().min(1).max(100),
  confidence_band: ConfidenceBand,
  data_confidence_score: z.number().int().min(1).max(100),
  data_confidence_band: ConfidenceBand,
  verdict_confidence_given_data_score: z.number().int().min(1).max(100),
  verdict_confidence_given_data_band: ConfidenceBand,
  verdict_confidence_robustness_score: z.number().int().min(1).max(100),
  verdict_confidence_robustness_band: ConfidenceBand,
  confidence_explanation: z.string(),
  primary_reason: z.string(),
  decisive_chain_id: z.string(),
  loser_best_argument: z.string(),
  why_not_other_side: z.string(),
  flip_condition: z.string(),
  key_factors: z.array(z.string()).min(2).max(5),
  risk_factors: z.array(z.string()).max(5),
  recommended_rematch: z.string(),
  summary_3_sentences: z.string(),
});

export const AppealSchema = obj({
  reason: z.enum([
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
  ]),
  target_ids: z.array(z.string()),
  summary: z.string(),
  needed: z.string(),
});

export const OmniversusBattleSchema = obj({
  metadata: obj({
    schema_version: z.literal(SCHEMA_VERSION),
    ruleset: z.literal("OMNIVERSUS_VSBW_STYLE"),
    battle_type: z.enum(["OBJECTIVE", "SUBJECTIVE"]),
    language: z.enum(["en", "uk"]),
    title: z.string(),
    canon_scope: z.string(),
    speed_equalized: z.boolean(),
    assumptions: z.string(),
  }),

  data_provenance: DataProvenanceSchema,
  rules: RulesSchema,
  stat_model: StatModelSchema,

  fighters: z.array(FighterSchema).length(2),
  tier_sanitization: z.array(TierSanitizationSchema).length(6),
  claims: z.array(ClaimSchema).min(2).max(14),
  argument_chains: z.array(ArgumentChainSchema).min(2).max(8),
  comparison: z.array(ComparisonSchema).min(3).max(10),
  ability_interactions: z.array(AbilityInteractionSchema).max(8),
  win_conditions: z.array(WinConditionSchema).min(2).max(6),

  audit: obj({
    sources: z.string(),
    data_inputs: z.string(),
    canon: z.string(),
    tier_ap: z.string(),
    speed: z.string(),
    ability_interactions: z.string(),
    resistances: z.string(),
    logical_chains: z.string(),
    confidence: z.string(),
  }),

  quality_flags: QualityFlagsSchema,

  narrative: z.array(NarrativeStepSchema).length(5),
  verdict: VerdictSchema,
  appeals: z.array(AppealSchema).max(6),

  ui: obj({
    headline: z.string(),
    subheadline: z.string(),
    share_text: z.string(),
    verdict_stamp: z.string(),
    chain_teaser: z.string(),
    tags: z.array(z.string()).max(8),
    card_variant: z.enum([
      "STOMP",
      "CLOSE_MATCH",
      "CONTROVERSIAL",
      "SUBJECTIVE",
      "INCONCLUSIVE",
    ]),
    primary_badge: z.string(),
  }),
});

export type OmniversusBattle = z.infer<typeof OmniversusBattleSchema>;
