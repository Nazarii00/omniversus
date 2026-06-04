import { OmniversusBattleSchema } from "@/server/battle/domain/schema";
import { describe, expect, test } from "@/test/testing";

import { prepareBattleOutput } from "./prepareBattleOutput";

describe("prepareBattleOutput", () => {
  test("expands sparse model output into the full battle contract", () => {
    const prepared = prepareBattleOutput(
      {
        verdict: {
          winner_side: "A",
          winner_name: "Captain America",
          difficulty: "HIGH_DIFF",
          confidence_score: 87,
          key_factors: ["Shield defense", "Close-combat skill"],
          primary_reason: "Captain America can force close combat.",
        },
      },
      {
        fighterA: "Captain America",
        fighterB: "Punisher",
        outputLanguage: "uk",
        speedEqualized: true,
      },
    );
    const parsed = OmniversusBattleSchema.safeParse(prepared);

    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error(parsed.error.message);

    expect(parsed.data.metadata.title).toBe("Captain America vs Punisher");
    expect(parsed.data.metadata.language).toBe("uk");
    expect(parsed.data.metadata.speed_equalized).toBe(true);
    expect(parsed.data.rules.speed_equalized).toBe(true);
    expect(parsed.data.fighters.map((fighter) => fighter.name)).toEqual([
      "Captain America",
      "Punisher",
    ]);
    expect(parsed.data.claims).toHaveLength(2);
    expect(parsed.data.argument_chains).toHaveLength(2);
    expect(parsed.data.comparison).toHaveLength(3);
    expect(parsed.data.tier_sanitization).toHaveLength(6);
    expect(parsed.data.narrative).toHaveLength(5);
  });

  test("preserves supplied structured fields while normalizing array bounds", () => {
    const prepared = prepareBattleOutput(
      {
        metadata: {
          title: "Model title should be replaced by context",
          battle_type: "OBJECTIVE",
        },
        fighters: [
          {
            side: "A",
            name: "Giorno Giovanna",
            verse: "JoJo's Bizarre Adventure",
            profile_weaknesses: [
              "Interpretation-dependent GER limits",
              "Limited physical durability",
              "Needs source review",
              "Potential stamina issue",
              "Opponent scale ambiguity",
              "Canon scope ambiguity",
              "This extra value should be trimmed",
            ],
          },
          {
            side: "B",
            name: "Ozymandias",
            verse: "Fate/Grand Order",
          },
        ],
        claims: [
          {
            id: "C1",
            side: "A",
            kind: "ABILITY",
            tag: "INTERPRETATION",
            category: "ABILITY",
            text: "GER interaction requires careful interpretation.",
            source_ref: "JoJo canon",
            source_type: "CANON",
            source_status: "REQUIRES_VERIFICATION",
            source_reliability: "PRIMARY",
            evidence_level: "INTERPRETATION",
            importance: "DECISIVE",
            confidence: 101,
            supports_verdict: true,
          },
        ],
        verdict: {
          winner_side: "INCONCLUSIVE",
          winner_name: "None",
          difficulty: "INCONCLUSIVE",
          confidence_score: 49,
          key_factors: ["Causality interaction", "Divine spirit scaling"],
        },
      },
      {
        fighterA: "Giorno Giovanna",
        fighterB: "Ozymandias",
      },
    );
    const parsed = OmniversusBattleSchema.safeParse(prepared);

    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error(parsed.error.message);

    expect(parsed.data.metadata.title).toBe("Giorno Giovanna vs Ozymandias");
    expect(parsed.data.fighters[0].profile.weaknesses).toHaveLength(6);
    expect(parsed.data.claims).toHaveLength(2);
    expect(parsed.data.claims[0].confidence).toBe(100);
    expect(parsed.data.verdict.confidence_band).toBe("INDETERMINATE_1_49");
  });
});
