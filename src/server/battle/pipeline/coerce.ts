import { SCHEMA_VERSION } from "../domain/schema";
import {
  ensureMinStringArray,
  looksLikeAbilityWinCondition,
  normalizeAppeal,
  normalizeClaim,
  normalizeCoreStats,
  normalizeDifficulty,
  normalizeFighter,
  normalizeSide,
  warningMatches,
} from "./coerceNormalizers";
import type { CoerceBattleDraftContext } from "./coerceTypes";
import {
  asArray,
  asBoolean,
  asRecord,
  asString,
  asStringArray,
  clampConfidenceBand,
  clampInt,
  normalizeToken,
  pickEnum,
} from "./coerceUtils";
import {
  ABILITY_TYPE_VALUES,
  CARD_VARIANT_VALUES,
  CHAIN_TYPE_VALUES,
  COMPARISON_CATEGORY_VALUES,
  CONFIDENCE_BAND_VALUES,
  DATA_PROVENANCE_VALUES,
  IMPACT_VALUES,
  NUMERICAL_STATS_ROLE_VALUES,
  PREMISE_ROLE_VALUES,
  PROBABILITY_VALUES,
  RULE_IMPACT_VALUES,
  SIDE_OR_TIE_VALUES,
  SIDE_RESULT_VALUES,
  WIN_TYPE_VALUES,
} from "./coerceValues";

export {
  isWeakAppealNeeded,
  looksLikeAbilityWinCondition,
} from "./coerceNormalizers";

export {
  asArray,
  asRecord,
  asString,
  asStringArray,
  clampConfidenceBand,
} from "./coerceUtils";

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
