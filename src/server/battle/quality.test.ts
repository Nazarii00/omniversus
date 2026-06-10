/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { computeBattleQualityScore } from "./quality";
import type { OmniversusBattle } from "./domain/schema";

// ---------------------------------------------------------------------------
// Helpers — build minimal valid OmniversusBattle fixtures
// All objects use `as any` to avoid patching individual Zod-inferred fields.
// ---------------------------------------------------------------------------

function makeVerifiedClaim(side: "A" | "B", overrides?: Record<string, any>) {
  return {
    id: `claim-${side}-${Math.random().toString(36).slice(2, 6)}`,
    side,
    kind: "DIRECT_FEAT",
    tag: "DIRECT",
    category: "AP",
    text: `${side} has demonstrated feat X`,
    source: {
      type: "CANON",
      ref: "Chapter 42 — detailed description of the feat",
      status: "VERIFIED",
      reliability: "PRIMARY",
      note: "",
    },
    evidence_level: "DIRECT",
    importance: "HIGH",
    confidence: 85,
    supports_verdict: true,
    review_flag: "OK",
    contested: false,
    outlier: false,
    appeal_hint: "",
    ...overrides,
  };
}

function makeChain(side: "A" | "B", overrides?: Record<string, any>) {
  return {
    id: `chain-${side}-1`,
    side,
    chain_type: "WIN_CONDITION",
    summary: `${side} wins via stat advantage`,
    confidence_score: 80,
    confidence_band: "CONFIDENT_65_79",
    contested: false,
    premises: [
      {
        id: "prem-1",
        role: "FACT",
        claim_id: "claim-A-1",
        text: "Stat advantage is decisive",
        contested: false,
      },
    ],
    counter_argument: "",
    chain_gap: "",
    appeal: "",
    linked_claim_ids: [],
    ...overrides,
  };
}

function makeNarrativeStep(step: number, aHp: number, bHp: number) {
  return {
    step,
    title: `Step ${step}`,
    log: "",
    a_hp: aHp,
    b_hp: bHp,
    why: "",
    claim_ids: [],
    chain_ids: [],
    contested: false,
  };
}

function makeFighter(
  side: "A" | "B",
  name: string,
  stats: { ap: string; durability: string; speed: string },
  overrides?: Record<string, any>,
) {
  return {
    side,
    name,
    version: "Canon",
    verse: "Verse",
    origin: {
      full_title: "Origin Title",
      abbreviation: "OT",
      continuity: "Canon",
      data_source: "MANUAL",
      source_note: "DB-backed",
    },
    tier: {
      rating: "Unknown",
      basis: "feats",
      contested: false,
      claim_ids: [],
    },
    profile: {
      ap: stats.ap,
      durability: stats.durability,
      speed: stats.speed,
      stamina: "High",
      abilities: "",
      resistances: "",
      skill: "",
      weaknesses: [],
      win_conditions: [],
      lose_conditions: [],
      counters: [],
    },
    best_argument: "",
    weakest_argument: "",
    ...overrides,
  };
}

function makeBaseBattle(overrides?: Record<string, any>): Record<string, any> {
  return {
    metadata: {
      schema_version: "omniversus.logic.v2",
      ruleset: "OMNIVERSUS_VSBW_STYLE",
      battle_type: "OBJECTIVE",
      language: "en",
      title: "Test Battle",
      canon_scope: "PRIMARY_CANON",
      speed_equalized: false,
      assumptions: "SBA",
    },
    data_provenance: {
      mode: "MANUAL",
      summary: "",
      input_risks: [],
      extraction_notes: "",
      needs_manual_review: false,
    },
    rules: {
      speed_equalized: false,
      prep_time: "NONE",
      prior_knowledge: "NONE",
      starting_distance: "50m",
      equipment_standard_only: true,
      verse_equalization: "DISABLED",
      retreat_allowed: false,
      collateral_concern: false,
      custom_rules: [],
      impact: "NONE",
      impact_detail: "",
    },
    stat_model: {
      ap: "MATCH_BASED",
      speed: "FEAT_BASED",
      tier_basis: "CONSISTENT",
      high_end_used: false,
      calc_accepted: false,
      model_note: "",
    },
    tier_sanitization: [],
    comparison: [],
    ability_interactions: [],
    win_conditions: [],
    audit: {
      sources: "",
      data_inputs: "",
      canon: "",
      tier_ap: "",
      speed: "",
      ability_interactions: "",
      resistances: "",
      logical_chains: "",
      confidence: "",
    },
    quality_flags: {
      has_data_input_warning: false,
      has_source_warning: false,
      has_scaling_risk: false,
      has_outlier_risk: false,
      has_subjective_only: false,
      overall: "OK",
      warnings: [],
    },
    appeals: [],
    ui: {
      headline: "",
      subheadline: "",
      share_text: "",
      verdict_stamp: "",
      chain_teaser: "",
      tags: [],
      card_variant: "CLOSE_MATCH",
      primary_badge: "",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeBattleQualityScore", () => {
  it("STOMP — high verified claims, clean chain, HP consistent => EXCELLENT", () => {
    const battle = makeBaseBattle({
      fighters: [
        makeFighter("A", "Goku", {
          ap: "Low Multiversal",
          durability: "Low Multiversal",
          speed: "MFTL+",
        }),
        makeFighter("B", "Superman", {
          ap: "Solar System",
          durability: "Solar System",
          speed: "FTL",
        }),
      ],
      claims: [
        makeVerifiedClaim("A", { category: "AP" }),
        makeVerifiedClaim("A", { category: "DURABILITY" }),
        makeVerifiedClaim("A", { category: "SPEED" }),
        makeVerifiedClaim("B", { category: "AP" }),
        makeVerifiedClaim("B", { category: "DURABILITY" }),
        makeVerifiedClaim("A", { category: "SKILL" }),
        makeVerifiedClaim("A", { category: "ABILITY" }),
      ],
      argument_chains: [makeChain("A"), makeChain("B")],
      narrative: [
        makeNarrativeStep(1, 100, 100),
        makeNarrativeStep(2, 90, 80),
        makeNarrativeStep(3, 75, 50),
        makeNarrativeStep(4, 60, 20),
        makeNarrativeStep(5, 50, 0),
      ],
      verdict: {
        winner_side: "A",
        winner_name: "Goku",
        difficulty: "STOMP",
        confidence_score: 90,
        confidence_band: "DOMINANT_80_100",
        data_confidence_score: 85,
        data_confidence_band: "DOMINANT_80_100",
        verdict_confidence_given_data_score: 88,
        verdict_confidence_given_data_band: "DOMINANT_80_100",
        verdict_confidence_robustness_score: 82,
        verdict_confidence_robustness_band: "DOMINANT_80_100",
        confidence_explanation: "",
        primary_reason: "",
        decisive_chain_id: "chain-A-1",
        loser_best_argument: "",
        why_not_other_side: "",
        flip_condition: "",
        key_factors: ["Stat advantage", "Speed blitz"],
        risk_factors: [],
        recommended_rematch: "",
        summary_3_sentences: "",
      },
    }) as unknown as OmniversusBattle;

    const result = computeBattleQualityScore(battle);

    expect(result.overall).toBeGreaterThanOrEqual(85);
    expect(result.band).toBe("EXCELLENT");
    expect(result.metrics.VERIFIED_CLAIMS_RATIO.score).toBeGreaterThan(50);
    expect(result.metrics.DECISIVE_CHAIN_STRENGTH.score).toBeGreaterThan(80);
  });

  it("CLOSE_MATCH — contested chain, fewer categories => FAIR/GOOD border", () => {
    const battle = makeBaseBattle({
      fighters: [
        makeFighter("A", "Goku", {
          ap: "Low Multiversal",
          durability: "Low Multiversal",
          speed: "MFTL+",
        }),
        makeFighter("B", "Superman", {
          ap: "Solar System",
          durability: "Solar System",
          speed: "FTL",
        }),
      ],
      claims: [
        makeVerifiedClaim("A", { category: "AP" }),
        makeVerifiedClaim("B", { category: "AP" }),
        makeVerifiedClaim("A", {
          category: "SPEED",
          source: {
            ...makeVerifiedClaim("A").source,
            status: "CONTESTED",
            ref: "wiki",
          },
        }),
      ],
      argument_chains: [makeChain("A", { contested: true }), makeChain("B")],
      narrative: [
        makeNarrativeStep(1, 100, 100),
        makeNarrativeStep(2, 85, 85),
        makeNarrativeStep(3, 70, 75),
        makeNarrativeStep(4, 55, 60),
        makeNarrativeStep(5, 40, 45),
      ],
      verdict: {
        winner_side: "B",
        winner_name: "Superman",
        difficulty: "HIGH_DIFF",
        confidence_score: 65,
        confidence_band: "CONFIDENT_65_79",
        data_confidence_score: 60,
        data_confidence_band: "CONTESTED_50_64",
        verdict_confidence_given_data_score: 55,
        verdict_confidence_given_data_band: "CONTESTED_50_64",
        verdict_confidence_robustness_score: 50,
        verdict_confidence_robustness_band: "CONTESTED_50_64",
        confidence_explanation: "",
        primary_reason: "",
        decisive_chain_id: "chain-B-1",
        loser_best_argument: "",
        why_not_other_side: "",
        flip_condition: "",
        key_factors: ["Close fight"],
        risk_factors: ["Contested chain"],
        recommended_rematch: "",
        summary_3_sentences: "",
      },
    }) as unknown as OmniversusBattle;

    const result = computeBattleQualityScore(battle);

    expect(result.overall).toBeGreaterThanOrEqual(45);
    expect(result.overall).toBeLessThan(85);
    expect(["FAIR", "GOOD"]).toContain(result.band);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("MODEL_INFERRED — no DB data, unreliable sources => POOR or UNRELIABLE", () => {
    const battle = makeBaseBattle({
      data_provenance: {
        mode: "MODEL_INFERRED",
        summary: "",
        input_risks: ["Both fighters model-inferred"],
        extraction_notes: "",
        needs_manual_review: true,
      },
      quality_flags: {
        has_data_input_warning: true,
        has_source_warning: true,
        has_scaling_risk: true,
        has_outlier_risk: false,
        has_subjective_only: false,
        overall: "NEEDS_SOURCE",
        warnings: ["Data input warning"],
      },
      fighters: [
        makeFighter(
          "A",
          "Goku",
          { ap: "Unknown", durability: "Unknown", speed: "Unknown" },
          {
            origin: {
              data_source: "MODEL_INFERRED",
              full_title: "Unknown",
              abbreviation: "UNK",
              continuity: "Unknown",
              source_note: "No DB data",
            },
          },
        ),
        makeFighter(
          "B",
          "Superman",
          { ap: "Unknown", durability: "Unknown", speed: "Unknown" },
          {
            origin: {
              data_source: "MODEL_INFERRED",
              full_title: "Unknown",
              abbreviation: "UNK",
              continuity: "Unknown",
              source_note: "No DB data",
            },
          },
        ),
      ],
      claims: [
        makeVerifiedClaim("A", {
          source: {
            type: "UNKNOWN",
            ref: "wiki",
            status: "REQUIRES_VERIFICATION",
            reliability: "COMMUNITY",
            note: "",
          },
        }),
        makeVerifiedClaim("B", {
          source: {
            type: "FANDOM",
            ref: "",
            status: "CONTESTED",
            reliability: "UNKNOWN",
            note: "",
          },
        }),
      ],
      argument_chains: [
        makeChain("A", {
          contested: true,
          premises: [
            {
              id: "prem-1",
              role: "FACT",
              claim_id: "N_A",
              text: "No linked claim",
              contested: true,
            },
          ],
        }),
      ],
      narrative: [
        makeNarrativeStep(1, 100, 100),
        makeNarrativeStep(2, 80, 90),
        makeNarrativeStep(3, 60, 80),
        makeNarrativeStep(4, 40, 70),
        makeNarrativeStep(5, 20, 60),
      ],
      verdict: {
        winner_side: "A",
        winner_name: "Goku",
        difficulty: "STOMP",
        confidence_score: 30,
        confidence_band: "INDETERMINATE_1_49",
        data_confidence_score: 20,
        data_confidence_band: "INDETERMINATE_1_49",
        verdict_confidence_given_data_score: 25,
        verdict_confidence_given_data_band: "INDETERMINATE_1_49",
        verdict_confidence_robustness_score: 15,
        verdict_confidence_robustness_band: "INDETERMINATE_1_49",
        confidence_explanation: "",
        primary_reason: "",
        decisive_chain_id: "chain-A-1",
        loser_best_argument: "",
        why_not_other_side: "",
        flip_condition: "",
        key_factors: ["Low confidence"],
        risk_factors: ["Data quality"],
        recommended_rematch: "",
        summary_3_sentences: "",
      },
    }) as unknown as OmniversusBattle;

    const result = computeBattleQualityScore(battle);

    expect(result.overall).toBeLessThan(50);
    expect(["POOR", "UNRELIABLE"]).toContain(result.band);
    expect(result.warnings.length).toBeGreaterThan(1);
  });
});
