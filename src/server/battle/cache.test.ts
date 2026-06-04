import { makeBattleFixture } from "@/test/battleFixtures";
import { describe, expect, test } from "@/test/testing";

import { orientBattleResultForRequest } from "./cache";

describe("battle cache", () => {
  test("re-orients cached side fields when fighters are requested in reverse order", () => {
    const cached = makeBattleFixture({ winnerSide: "A" });
    const oriented = orientBattleResultForRequest(
      cached,
      "Punisher",
      "Captain America",
    );

    expect(oriented.metadata.title).toBe("Punisher vs Captain America");
    expect(oriented.fighters.map((fighter) => fighter.name)).toEqual([
      "Punisher",
      "Captain America",
    ]);
    expect(oriented.verdict.winner_side).toBe("B");
    expect(oriented.claims.map((claim) => claim.side)).toEqual(["B", "A"]);
    expect(oriented.comparison.map((row) => row.winner)).toEqual([
      "B",
      "A",
      "B",
    ]);
    expect(oriented.ability_interactions[0].attacker).toBe("B");
    expect(oriented.ability_interactions[0].defender).toBe("A");
    expect(oriented.win_conditions.map((condition) => condition.side)).toEqual([
      "B",
      "A",
    ]);
    expect(oriented.narrative[0].a_hp).toBe(cached.narrative[0].b_hp);
    expect(oriented.narrative[0].b_hp).toBe(cached.narrative[0].a_hp);
  });
});
