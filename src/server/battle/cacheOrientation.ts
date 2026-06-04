import type { OmniversusBattle } from "./domain/schema";

type BattleSide = "A" | "B";

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function flipSide<T extends string>(side: T): T {
  if (side === "A") return "B" as T;
  if (side === "B") return "A" as T;
  return side;
}

function sideOrder(side: BattleSide): number {
  return side === "A" ? 0 : 1;
}

function shouldSwapCachedBattleSides(
  result: OmniversusBattle,
  fighterA: string,
  fighterB: string,
): boolean {
  const cachedA = result.fighters.find((fighter) => fighter.side === "A");
  const cachedB = result.fighters.find((fighter) => fighter.side === "B");

  if (!cachedA || !cachedB) return false;

  return (
    normalizeName(cachedA.name) === normalizeName(fighterB) &&
    normalizeName(cachedB.name) === normalizeName(fighterA)
  );
}

/**
 * Re-orient an order-independent cached result so side A/B matches the current
 * request order. The cache key treats A-vs-B and B-vs-A as the same matchup,
 * but the arena maps side A to the left card and side B to the right card.
 */
export function orientBattleResultForRequest(
  result: OmniversusBattle,
  fighterA: string,
  fighterB: string,
): OmniversusBattle {
  if (!shouldSwapCachedBattleSides(result, fighterA, fighterB)) {
    return result;
  }

  return {
    ...result,
    metadata: {
      ...result.metadata,
      title: `${fighterA.trim()} vs ${fighterB.trim()}`,
    },
    fighters: result.fighters
      .map((fighter) => ({
        ...fighter,
        side: flipSide(fighter.side),
      }))
      .sort((left, right) => sideOrder(left.side) - sideOrder(right.side)),
    tier_sanitization: result.tier_sanitization.map((item) => ({
      ...item,
      side: flipSide(item.side),
    })),
    claims: result.claims.map((claim) => ({
      ...claim,
      side: flipSide(claim.side),
    })),
    argument_chains: result.argument_chains.map((chain) => ({
      ...chain,
      side: flipSide(chain.side),
    })),
    comparison: result.comparison.map((row) => ({
      ...row,
      winner: flipSide(row.winner),
    })),
    ability_interactions: result.ability_interactions.map((row) => ({
      ...row,
      attacker: flipSide(row.attacker),
      defender: flipSide(row.defender),
    })),
    win_conditions: result.win_conditions.map((condition) => ({
      ...condition,
      side: flipSide(condition.side),
    })),
    narrative: result.narrative.map((step) => ({
      ...step,
      a_hp: step.b_hp,
      b_hp: step.a_hp,
    })),
    verdict: {
      ...result.verdict,
      winner_side: flipSide(result.verdict.winner_side),
    },
  };
}
