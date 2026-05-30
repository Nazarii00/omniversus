import { makeBattleFixture } from "@/test/battleFixtures";
import { describe, expect, test } from "@/test/testing";

import {
  buildAutoAppeals,
  capConfidence,
  normalizeBattleResult,
} from "./normalize";

describe("battle result normalization", () => {
  test("caps confidence and records the cap reason", () => {
    const battle = makeBattleFixture({ confidenceScore: 95 });
    const capped = capConfidence(
      battle,
      70,
      "Curated source coverage is incomplete.",
    );

    expect(capped.verdict.confidence_score).toBeLessThanOrEqual(70);
    expect(capped.quality_flags.has_confidence_cap).toBe(true);
    expect(capped.quality_flags.confidence_cap_reason).toBe(
      "Curated source coverage is incomplete.",
    );
    expect(capped.verdict.risk_factors).toContain(
      "Curated source coverage is incomplete.",
    );
  });

  test("adds data input appeals for inferred or otherwise risky data", () => {
    const battle = makeBattleFixture();
    const appeals = buildAutoAppeals(battle);

    expect(appeals.map((appeal) => appeal.reason)).toContain(
      "DATA_INPUT_ERROR",
    );
  });

  test("normalizes subjective battles by removing ability rows and capping certainty", () => {
    const battle = makeBattleFixture({
      battleType: "SUBJECTIVE",
      confidenceScore: 92,
    });
    const normalized = normalizeBattleResult(battle);

    expect(normalized.ability_interactions).toHaveLength(0);
    expect(normalized.verdict.confidence_score).toBeLessThanOrEqual(60);
    expect(normalized.quality_flags.has_confidence_cap).toBe(true);
    expect(normalized.quality_flags.confidence_cap_reason).toBe(
      "Subjective battles cap verdict confidence at 60.",
    );
  });
});
