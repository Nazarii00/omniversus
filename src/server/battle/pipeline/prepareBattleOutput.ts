import { SCHEMA_VERSION } from "../domain/schema";

export type PrepareBattleOutputContext = {
  fighterA?: string;
  fighterB?: string;
  outputLanguage?: "en" | "uk";
  speedEqualized?: boolean;
};

type Side = "A" | "B";

const CONFIDENCE_BANDS = {
  dominant: "DOMINANT_80_100",
  confident: "CONFIDENT_65_79",
  contested: "CONTESTED_50_64",
  indeterminate: "INDETERMINATE_1_49",
} as const;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(
  value: unknown,
  fallback: number,
  min = 1,
  max = 100,
): number {
  const parsed =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function asStringArray(value: unknown): string[] {
  return asArray(value).flatMap((item) =>
    typeof item === "string" && item.trim() ? [item] : [],
  );
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined);
}

function confidenceBand(score: number): string {
  if (score >= 80) return CONFIDENCE_BANDS.dominant;
  if (score >= 65) return CONFIDENCE_BANDS.confident;
  if (score >= 50) return CONFIDENCE_BANDS.contested;
  return CONFIDENCE_BANDS.indeterminate;
}

function fighterTitle(context: PrepareBattleOutputContext): string | null {
  const fighterA = asString(context.fighterA).trim();
  const fighterB = asString(context.fighterB).trim();

  return fighterA && fighterB ? `${fighterA} vs ${fighterB}` : null;
}

function readSpeedEqualized(
  metadata: Record<string, unknown>,
  rules: Record<string, unknown>,
  context: PrepareBattleOutputContext,
) {
  if (typeof context.speedEqualized === "boolean") {
    return context.speedEqualized;
  }

  if (typeof metadata.speed_equalized === "boolean") {
    return metadata.speed_equalized;
  }

  return typeof rules.speed_equalized === "boolean"
    ? rules.speed_equalized
    : false;
}

function fallbackFighter(side: Side, context: PrepareBattleOutputContext) {
  return {
    side,
    name:
      side === "A"
        ? asString(context.fighterA, "Fighter A")
        : asString(context.fighterB, "Fighter B"),
    version: "Unknown",
    verse: "Unknown",
    tier_rating: "Unknown",
    tier_basis: "Source requires verification",
    tier_claim_ids: [],
    source_note: "Source requires verification",
    profile: {
      ap: "Unknown",
      speed: "Unknown",
      durability: "Unknown",
      stamina: "Unknown",
      abilities: "Unknown",
      resistances: "Unknown",
      skill: "Unknown",
      weaknesses: [],
      win_conditions: [],
      lose_conditions: [],
      counters: [],
    },
    best_argument: "Unknown",
    weakest_argument: "Unknown",
  };
}

function prepareFighters(value: unknown, context: PrepareBattleOutputContext) {
  const inputs = asArray(value);
  const fighters = (["A", "B"] as const).map((side) => {
    const input =
      inputs.find((item) => asRecord(item).side === side) ??
      inputs[side === "A" ? 0 : 1] ??
      fallbackFighter(side, context);
    const fighter = asRecord(input);
    const origin = asRecord(fighter.origin);
    const tier = asRecord(fighter.tier);
    const profile = asRecord(fighter.profile);
    const fallback = fallbackFighter(side, context);

    return {
      side,
      name: asString(fighter.name, fallback.name),
      version: asString(fighter.version, fallback.version),
      verse: asString(fighter.verse, fallback.verse),
      origin: {
        full_title: asString(
          firstDefined(fighter.origin_full_title, origin.full_title),
          asString(fighter.verse, fallback.verse),
        ),
        abbreviation: asString(
          firstDefined(fighter.origin_abbreviation, origin.abbreviation),
          "Unknown",
        ),
        continuity: asString(
          firstDefined(fighter.origin_continuity, origin.continuity),
          "Unknown",
        ),
        data_source: asString(
          firstDefined(fighter.origin_data_source, origin.data_source),
          "MODEL_INFERRED",
        ),
        source_note: asString(
          firstDefined(
            fighter.origin_source_note,
            origin.source_note,
            fighter.source_note,
          ),
          "Source requires verification",
        ),
      },
      tier: {
        rating: asString(
          firstDefined(fighter.tier_rating, tier.rating),
          fallback.tier_rating,
        ),
        basis: asString(
          firstDefined(fighter.tier_basis, tier.basis),
          fallback.tier_basis,
        ),
        contested: asBoolean(
          firstDefined(fighter.tier_contested, tier.contested),
          false,
        ),
        claim_ids: asStringArray(
          firstDefined(fighter.tier_claim_ids, tier.claim_ids),
        ),
      },
      profile: {
        ap: asString(firstDefined(fighter.profile_ap, profile.ap), "Unknown"),
        durability: asString(
          firstDefined(fighter.profile_durability, profile.durability),
          "Unknown",
        ),
        speed: asString(
          firstDefined(fighter.profile_speed, profile.speed),
          "Unknown",
        ),
        stamina: asString(
          firstDefined(fighter.profile_stamina, profile.stamina),
          "Unknown",
        ),
        abilities: asString(
          firstDefined(fighter.profile_abilities, profile.abilities),
          "Unknown",
        ),
        resistances: asString(
          firstDefined(fighter.profile_resistances, profile.resistances),
          "Unknown",
        ),
        skill: asString(
          firstDefined(fighter.profile_skill, profile.skill),
          "Unknown",
        ),
        weaknesses: asStringArray(
          firstDefined(fighter.profile_weaknesses, profile.weaknesses),
        ).slice(0, 6),
        win_conditions: asStringArray(
          firstDefined(fighter.profile_win_conditions, profile.win_conditions),
        ).slice(0, 5),
        lose_conditions: asStringArray(
          firstDefined(
            fighter.profile_lose_conditions,
            profile.lose_conditions,
          ),
        ).slice(0, 5),
        counters: asStringArray(
          firstDefined(fighter.profile_counters, profile.counters),
        ).slice(0, 5),
      },
      best_argument: asString(fighter.best_argument, "Unknown"),
      weakest_argument: asString(fighter.weakest_argument, "Unknown"),
    };
  });

  return fighters;
}

function sourceTypeFromRef(sourceRef: string): string {
  if (sourceRef === "N_A") return "N_A";
  if (/vsbw|versus battles/i.test(sourceRef)) return "VSBW";
  if (/fandom/i.test(sourceRef)) return "FANDOM";
  if (/calc/i.test(sourceRef)) return "CALC";
  if (/wiki/i.test(sourceRef)) return "WIKI";
  return "UNKNOWN";
}

function prepareClaims(value: unknown) {
  const claims = asArray(value).map((input, index) => {
    const claim = asRecord(input);
    const source = asRecord(claim.source);
    const sourceRef = asString(
      firstDefined(claim.source_ref, source.ref),
      "Source requires verification",
    );
    const sourceType = asString(
      firstDefined(claim.source_type, source.type),
      sourceTypeFromRef(sourceRef),
    );
    const sourceStatus =
      sourceType === "N_A"
        ? "NOT_REQUIRED"
        : asString(
            firstDefined(claim.source_status, source.status),
            "REQUIRES_VERIFICATION",
          );
    const sourceReliability =
      sourceType === "N_A"
        ? "N_A"
        : asString(
            firstDefined(claim.source_reliability, source.reliability),
            "UNKNOWN",
          );
    const contested = asBoolean(claim.contested, sourceStatus !== "VERIFIED");

    return {
      id: asString(claim.id, `C${index + 1}`),
      side: asString(claim.side, "SYSTEM"),
      kind: asString(claim.kind, "DATA_QUALITY"),
      tag: asString(claim.tag, "INTERPRETATION"),
      category: asString(claim.category, "DATA_QUALITY"),
      text: asString(claim.text, "Source requires verification"),
      source: {
        type: sourceType,
        ref: sourceRef,
        status: sourceStatus,
        reliability: sourceReliability,
        note: asString(
          firstDefined(claim.source_note, source.note),
          "Source requires verification",
        ),
      },
      evidence_level: asString(claim.evidence_level, "UNKNOWN"),
      importance: asString(claim.importance, "MEDIUM"),
      confidence: asNumber(claim.confidence, 50),
      supports_verdict: asBoolean(claim.supports_verdict, false),
      review_flag: asString(
        claim.review_flag,
        contested ? "NEEDS_SOURCE" : "OK",
      ),
      contested,
      outlier: asBoolean(claim.outlier, false),
      appeal_hint: asString(claim.appeal_hint, "Verify source and scaling."),
    };
  });

  while (claims.length < 2) {
    const id = `C${claims.length + 1}`;
    claims.push({
      id,
      side: "SYSTEM",
      kind: "DATA_QUALITY",
      tag: "INTERPRETATION",
      category: "DATA_QUALITY",
      text: "Source requires verification",
      source: {
        type: "UNKNOWN",
        ref: "Source requires verification",
        status: "REQUIRES_VERIFICATION",
        reliability: "UNKNOWN",
        note: "Generated fallback claim.",
      },
      evidence_level: "UNKNOWN",
      importance: "LOW",
      confidence: 50,
      supports_verdict: false,
      review_flag: "NEEDS_SOURCE",
      contested: true,
      outlier: false,
      appeal_hint: "Provide source data.",
    });
  }

  return claims.slice(0, 14);
}

function preparePremises(chain: Record<string, unknown>, index: number) {
  const nestedPremises = asArray(chain.premises);
  const premises = nestedPremises.map((input, premiseIndex) => {
    const premise = asRecord(input);

    return {
      id: asString(premise.id, `P${index + 1}.${premiseIndex + 1}`),
      role: asString(premise.role, "FACT"),
      claim_id: asString(premise.claim_id, "N_A"),
      text: asString(premise.text, "Source requires verification"),
      contested: asBoolean(premise.contested, false),
    };
  });

  while (premises.length < 2) {
    premises.push({
      id: `P${index + 1}.${premises.length + 1}`,
      role: "ASSUMPTION",
      claim_id: "N_A",
      text: "Fallback premise added to satisfy chain shape.",
      contested: true,
    });
  }

  return premises.slice(0, 6);
}

function prepareArgumentChains(value: unknown) {
  const chains = asArray(value).map((input, index) => {
    const chain = asRecord(input);

    return {
      id: asString(chain.id, `CH${index + 1}`),
      side: asString(chain.side, index === 0 ? "A" : "B"),
      chain_type: asString(
        chain.chain_type,
        index === 0 ? "WIN_CONDITION" : "ANTI_ARGUMENT",
      ),
      title: asString(chain.title, `Argument chain ${index + 1}`),
      conclusion: asString(chain.conclusion, "Source requires verification"),
      premises: preparePremises(chain, index),
      inference_rule: asString(
        chain.inference_rule,
        "Claim-supported inference.",
      ),
      inference: asString(chain.inference, "Source requires verification"),
      confidence: asNumber(chain.confidence, 50),
      contested: asBoolean(chain.contested, false),
      breaks_if: asString(
        chain.breaks_if,
        "Source review changes the premise.",
      ),
      linked_claim_ids: asStringArray(chain.linked_claim_ids),
    };
  });

  while (chains.length < 2) {
    const index = chains.length;
    chains.push({
      id: `CH${index + 1}`,
      side: index === 0 ? "A" : "B",
      chain_type: index === 0 ? "WIN_CONDITION" : "ANTI_ARGUMENT",
      title: `Fallback chain ${index + 1}`,
      conclusion: "Source requires verification",
      premises: preparePremises({}, index),
      inference_rule: "Fallback inference.",
      inference: "Source requires verification",
      confidence: 50,
      contested: true,
      breaks_if: "Better source data changes the route.",
      linked_claim_ids: [],
    });
  }

  return chains.slice(0, 8);
}

function prepareTierSanitization(fighters: ReturnType<typeof prepareFighters>) {
  return fighters.flatMap((fighter) =>
    (["AP", "DURABILITY", "SPEED"] as const).map((stat) => {
      const profileValue =
        stat === "AP"
          ? fighter.profile.ap
          : stat === "DURABILITY"
            ? fighter.profile.durability
            : fighter.profile.speed;

      return {
        side: fighter.side,
        stat,
        consistent_tier: profileValue,
        high_end_tier: profileValue,
        highball_tier: "Unknown",
        rejected_tiers: [],
        operational_tier_used: profileValue,
        operational_tier_class:
          profileValue === "Unknown" ? "UNKNOWN" : "CONSISTENT",
        basis_claim_ids: fighter.tier.claim_ids,
        warning: fighter.tier.basis,
        contested: fighter.tier.contested,
      };
    }),
  );
}

function prepareStatModel(value: unknown) {
  const statModel = asRecord(value);
  const coreStats = asStringArray(statModel.core_stats_used).filter((stat) =>
    ["AP", "DURABILITY", "SPEED", "STAMINA"].includes(stat),
  );
  const requiredStats = ["AP", "DURABILITY", "SPEED"];

  for (const stat of requiredStats) {
    if (!coreStats.includes(stat)) coreStats.push(stat);
  }

  return {
    core_stats_used: coreStats.slice(0, 4),
    numerical_stats_role: asString(statModel.numerical_stats_role, "SECONDARY"),
    hax_is_not_numeric: asBoolean(statModel.hax_is_not_numeric, true),
    stamina_policy: asString(
      statModel.stamina_policy,
      "Track stamina qualitatively.",
    ),
    notes: asString(
      statModel.notes,
      "Stats are interpreted with source review.",
    ),
  };
}

function prepareComparison(value: unknown) {
  const comparison = asArray(value).map((input) => {
    const row = asRecord(input);

    return {
      category: asString(row.category, "AP"),
      winner: asString(row.winner, "INCONCLUSIVE"),
      margin: asString(row.margin, "NONE"),
      reason: asString(row.reason, "Source requires verification"),
      claim_ids: asStringArray(row.claim_ids),
      contested: asBoolean(row.contested, false),
    };
  });

  const fallbackCategories = ["AP", "SPEED", "ABILITY"];
  while (comparison.length < 3) {
    comparison.push({
      category: fallbackCategories[comparison.length] ?? "AP",
      winner: "INCONCLUSIVE",
      margin: "NONE",
      reason: "Source requires verification",
      claim_ids: [],
      contested: true,
    });
  }

  return comparison.slice(0, 10);
}

function prepareAbilityInteractions(value: unknown) {
  return asArray(value)
    .map((input, index) => {
      const ability = asRecord(input);

      return {
        id: asString(ability.id, `AI${index + 1}`),
        attacker: asString(ability.attacker, "A"),
        defender: asString(ability.defender, "B"),
        ability: asString(ability.ability, "Unknown"),
        ability_type: asString(ability.ability_type, "OTHER"),
        activation: asString(ability.activation, "Unknown"),
        range: asString(ability.range, "Unknown"),
        timing: asString(ability.timing, "Unknown"),
        target_requirement: asString(ability.target_requirement, "Unknown"),
        defender_resistance: asString(ability.defender_resistance, "Unknown"),
        resistance_basis: asString(ability.resistance_basis, "Unknown"),
        structurally_similar_resistance: asString(
          ability.structurally_similar_resistance,
          "Unknown",
        ),
        deliverable: asBoolean(ability.deliverable, false),
        effective: asString(ability.effective, "UNCLEAR"),
        relevance_to_win_condition: asString(
          ability.relevance_to_win_condition,
          "Unknown",
        ),
        reason: asString(ability.reason, "Source requires verification"),
        counterplay: asString(ability.counterplay, "Unknown"),
        contested: asBoolean(ability.contested, false),
        impact: asString(ability.impact, "NONE"),
        claim_ids: asStringArray(ability.claim_ids),
        chain_ids: asStringArray(ability.chain_ids),
      };
    })
    .slice(0, 8);
}

function prepareWinConditions(value: unknown) {
  const winConditions = asArray(value).map((input, index) => {
    const condition = asRecord(input);

    return {
      id: asString(condition.id, `WC${index + 1}`),
      side: asString(condition.side, index === 0 ? "A" : "B"),
      method: asString(condition.method, "Unknown"),
      type: asString(condition.type, "STAT_CHECK"),
      requires: asString(condition.requires, "Source requires verification"),
      blocked_by: asString(condition.blocked_by, "Unknown"),
      probability: asString(condition.probability, "LOW"),
      claim_ids: asStringArray(condition.claim_ids),
      chain_ids: asStringArray(condition.chain_ids),
      contested: asBoolean(condition.contested, false),
    };
  });

  while (winConditions.length < 2) {
    const index = winConditions.length;
    winConditions.push({
      id: `WC${index + 1}`,
      side: index === 0 ? "A" : "B",
      method: "Unknown",
      type: "STAT_CHECK",
      requires: "Source requires verification",
      blocked_by: "Unknown",
      probability: "LOW",
      claim_ids: [],
      chain_ids: [],
      contested: true,
    });
  }

  return winConditions.slice(0, 6);
}

function prepareNarrative(value: unknown) {
  const narrative = asArray(value).map((input, index) => {
    const step = asRecord(input);

    return {
      step: asNumber(step.step, index + 1, 1, 5),
      title: asString(step.title, `Step ${index + 1}`),
      log: asString(step.log, "Source requires verification"),
      a_hp: asNumber(step.a_hp, 50, 0, 100),
      b_hp: asNumber(step.b_hp, 50, 0, 100),
      why: asString(step.why, "Source requires verification"),
      claim_ids: asStringArray(step.claim_ids),
      chain_ids: asStringArray(step.chain_ids),
      contested: asBoolean(step.contested, false),
    };
  });

  while (narrative.length < 5) {
    const index = narrative.length;
    narrative.push({
      step: index + 1,
      title: `Step ${index + 1}`,
      log: "Source requires verification",
      a_hp: 50,
      b_hp: 50,
      why: "Source requires verification",
      claim_ids: [],
      chain_ids: [],
      contested: true,
    });
  }

  return narrative.slice(0, 5);
}

function prepareVerdict(value: unknown) {
  const verdict = asRecord(value);
  const confidenceScore = asNumber(verdict.confidence_score, 50);
  const dataConfidence = asNumber(verdict.data_confidence_score, 50);
  const givenData = asNumber(
    verdict.verdict_confidence_given_data_score,
    confidenceScore,
  );
  const robustness = asNumber(
    verdict.verdict_confidence_robustness_score,
    confidenceScore,
  );

  const keyFactors = asStringArray(verdict.key_factors).slice(0, 5);
  while (keyFactors.length < 2) {
    keyFactors.push("Source requires verification");
  }

  return {
    winner_side: asString(verdict.winner_side, "INCONCLUSIVE"),
    winner_name: asString(verdict.winner_name, "None"),
    difficulty: asString(verdict.difficulty, "INCONCLUSIVE"),
    confidence_score: confidenceScore,
    confidence_band: asString(
      verdict.confidence_band,
      confidenceBand(confidenceScore),
    ),
    data_confidence_score: dataConfidence,
    data_confidence_band: asString(
      verdict.data_confidence_band,
      confidenceBand(dataConfidence),
    ),
    verdict_confidence_given_data_score: givenData,
    verdict_confidence_given_data_band: asString(
      verdict.verdict_confidence_given_data_band,
      confidenceBand(givenData),
    ),
    verdict_confidence_robustness_score: robustness,
    verdict_confidence_robustness_band: asString(
      verdict.verdict_confidence_robustness_band,
      confidenceBand(robustness),
    ),
    confidence_explanation: asString(
      verdict.confidence_explanation,
      "Source requires verification",
    ),
    primary_reason: asString(
      verdict.primary_reason,
      "Source requires verification",
    ),
    decisive_chain_id: asString(verdict.decisive_chain_id, "CH1"),
    loser_best_argument: asString(verdict.loser_best_argument, "Unknown"),
    why_not_other_side: asString(verdict.why_not_other_side, "Unknown"),
    flip_condition: asString(verdict.flip_condition, "Better source data."),
    key_factors: keyFactors,
    risk_factors: asStringArray(verdict.risk_factors).slice(0, 5),
    recommended_rematch: asString(verdict.recommended_rematch, "None"),
    summary_3_sentences: asString(
      verdict.summary_3_sentences,
      "Source requires verification. The matchup needs review. No final detail is available.",
    ),
  };
}

function prepareAppeals(value: unknown) {
  return asArray(value)
    .map((input) => {
      const appeal = asRecord(input);

      return {
        reason: asString(appeal.reason, "OTHER"),
        target_ids: asStringArray(appeal.target_ids),
        summary: asString(appeal.summary, "Source requires verification"),
        needed: asString(appeal.needed, "Better source data"),
      };
    })
    .slice(0, 6);
}

function prepareQualityFlags(value: unknown) {
  const flags = asRecord(value);
  const activeWarnings = asStringArray(flags.active_warnings);

  return {
    has_unverified_sources: activeWarnings.length > 0,
    has_contested_scaling: activeWarnings.some((warning) =>
      /scaling|tier|calc/i.test(warning),
    ),
    has_possible_outliers: activeWarnings.some((warning) =>
      /outlier|highball/i.test(warning),
    ),
    has_mechanics_mismatch: activeWarnings.some((warning) =>
      /mechanic|resistance|ability/i.test(warning),
    ),
    has_confidence_cap: Boolean(asString(flags.confidence_cap_reason)),
    has_data_input_warning: activeWarnings.length > 0,
    has_chain_gap: activeWarnings.some((warning) => /chain|gap/i.test(warning)),
    active_warnings: activeWarnings.slice(0, 6),
    most_fragile_assumption: asString(
      flags.most_fragile_assumption,
      "Source requires verification",
    ),
    confidence_cap_reason: asString(flags.confidence_cap_reason, "None"),
  };
}

function prepareAudit(value: unknown) {
  const audit = asRecord(value);

  return {
    sources: asString(audit.sources, "Diagnostic schema omitted sources."),
    data_inputs: asString(
      audit.data_inputs,
      "Only compact verdict fields were requested.",
    ),
    canon: asString(audit.canon, "Source requires verification."),
    tier_ap: asString(audit.tier_ap, "Source requires verification."),
    speed: asString(audit.speed, "Source requires verification."),
    ability_interactions: asString(
      audit.ability_interactions,
      "Not requested in diagnostic schema.",
    ),
    resistances: asString(audit.resistances, "Source requires verification."),
    logical_chains: asString(
      audit.logical_chains,
      "Not requested in diagnostic schema.",
    ),
    confidence: asString(audit.confidence, "Model-estimated confidence."),
  };
}

function prepareUi(value: unknown, verdict: ReturnType<typeof prepareVerdict>) {
  const ui = asRecord(value);
  const winner =
    verdict.winner_side === "A" || verdict.winner_side === "B"
      ? `${verdict.winner_name} wins`
      : "Inconclusive";

  return {
    headline: asString(ui.headline, winner),
    subheadline: asString(ui.subheadline, verdict.primary_reason),
    share_text: asString(ui.share_text, verdict.summary_3_sentences),
    verdict_stamp: asString(ui.verdict_stamp, verdict.difficulty),
    chain_teaser: asString(ui.chain_teaser, verdict.primary_reason),
    tags: asStringArray(ui.tags).slice(0, 8),
    card_variant: asString(
      ui.card_variant,
      verdict.winner_side === "INCONCLUSIVE" ? "INCONCLUSIVE" : "CLOSE_MATCH",
    ),
    primary_badge: asString(ui.primary_badge, verdict.difficulty),
  };
}

export function prepareBattleOutput(
  raw: unknown,
  context: PrepareBattleOutputContext = {},
): unknown {
  const draft = asRecord(raw);
  const sourceMetadata = asRecord(draft.metadata);
  const sourceRules = asRecord(draft.rules);
  const title =
    fighterTitle(context) ?? asString(sourceMetadata.title, "Battle");
  const speedEqualized = readSpeedEqualized(
    sourceMetadata,
    sourceRules,
    context,
  );
  const fighters = prepareFighters(draft.fighters, context);
  const claims = prepareClaims(draft.claims);
  const argumentChains = prepareArgumentChains(draft.argument_chains);
  const verdict = prepareVerdict(draft.verdict);

  return {
    metadata: {
      schema_version: SCHEMA_VERSION,
      ruleset: "OMNIVERSUS_VSBW_STYLE",
      battle_type: asString(sourceMetadata.battle_type, "OBJECTIVE"),
      language: context.outputLanguage ?? "en",
      title,
      canon_scope: asString(sourceMetadata.canon_scope, "PRIMARY_CANON"),
      speed_equalized: speedEqualized,
      assumptions: asString(sourceMetadata.assumptions, "Unknown"),
    },
    data_provenance: {
      mode: "MODEL_INFERRED",
      summary: "Generated from compact Gemini battle output.",
      input_risks: ["Source fields require verification"],
      extraction_notes: "Compact transport schema expanded server-side.",
      needs_manual_review: true,
    },
    rules: {
      assumption_set: asString(sourceRules.assumption_set, "VSBW_SBA"),
      location: asString(sourceRules.location, "Central Park, New York City"),
      starting_distance: asString(
        sourceRules.starting_distance,
        "range-based, capped at 4 km",
      ),
      prep_time: asString(sourceRules.prep_time, "none"),
      prior_knowledge: asString(
        sourceRules.prior_knowledge,
        "appearance and starting direction only",
      ),
      equipment: asString(sourceRules.equipment, "standard equipment"),
      verse_equalization: asString(
        sourceRules.verse_equalization,
        "reasonable interaction only; no new resistances",
      ),
      speed_equalized: speedEqualized,
      rule_impact: asString(sourceRules.rule_impact, "NONE"),
      rule_notes: asString(sourceRules.rule_notes, "None"),
    },
    stat_model: prepareStatModel(draft.stat_model),
    fighters,
    tier_sanitization: prepareTierSanitization(fighters),
    claims,
    argument_chains: argumentChains,
    comparison: prepareComparison(draft.comparison),
    ability_interactions: prepareAbilityInteractions(
      draft.ability_interactions,
    ),
    win_conditions: prepareWinConditions(draft.win_conditions),
    audit: prepareAudit(draft.audit),
    quality_flags: prepareQualityFlags(draft.quality_flags),
    narrative: prepareNarrative(draft.narrative),
    verdict,
    appeals: prepareAppeals(draft.appeals),
    ui: prepareUi(draft.ui, verdict),
  };
}
