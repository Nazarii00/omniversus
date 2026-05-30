import type { BattleReportJson } from "@/features/battle-report";
import { describe, expect, test } from "@/test/testing";

import {
  BATTLE_CREDIT_COST,
  CREDIT_TOP_UP_AMOUNT,
  applyArenaBetSettlement,
  lockArenaBet,
  normalizeArenaWallet,
  parseArenaBetAmount,
  refundArenaLockedBet,
  settleArenaBet,
  topUpArenaWallet,
} from "./betting";

function reportWithWinner(
  winnerSide: "A" | "B" | "DRAW" | "INCONCLUSIVE",
): BattleReportJson {
  return {
    verdict: {
      winner_side: winnerSide,
    },
  } as unknown as BattleReportJson;
}

describe("arena betting logic", () => {
  test("normalizes wallet values without allowing negative or fractional balances", () => {
    expect(normalizeArenaWallet({ credits: 2.9, reputation: 48.7 })).toEqual({
      credits: 2,
      reputation: 48,
    });

    expect(normalizeArenaWallet({ credits: -5, reputation: Number.NaN })).toEqual(
      {
        credits: 0,
        reputation: 1250,
      },
    );
  });

  test("parses stake amounts conservatively", () => {
    expect(parseArenaBetAmount("12.9")).toBe(12);
    expect(parseArenaBetAmount("-1")).toBe(0);
    expect(parseArenaBetAmount("not-a-number")).toBe(0);
  });

  test("locks a valid bet by charging battle credits and stake reputation", () => {
    const result = lockArenaBet(
      { credits: 3, reputation: 100 },
      { amountText: "25", side: "left" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);

    expect(result.lockedBet).toEqual({ amount: 25, side: "left" });
    expect(result.wallet).toEqual({
      credits: 3 - BATTLE_CREDIT_COST,
      reputation: 75,
    });
    expect(result.status).toBe("STAKE_LOCKED -25");
  });

  test("rejects bets when credits or reputation are insufficient", () => {
    const noCredits = lockArenaBet(
      { credits: 0, reputation: 100 },
      { amountText: "10", side: "right" },
    );
    const lowReputation = lockArenaBet(
      { credits: 2, reputation: 5 },
      { amountText: "10", side: "right" },
    );

    expect(noCredits.ok).toBe(false);
    if (noCredits.ok) throw new Error("Expected no-credits failure");
    expect(noCredits.reason).toBe("NO_CREDITS");

    expect(lowReputation.ok).toBe(false);
    if (lowReputation.ok) throw new Error("Expected low-reputation failure");
    expect(lowReputation.reason).toBe("LOW_REPUTATION");
  });

  test("settles wins, losses, no-stakes, and inconclusive outcomes", () => {
    expect(
      settleArenaBet(reportWithWinner("A"), { amount: 40, side: "left" }),
    ).toEqual({
      payout: 80,
      status: "BET_WON +40",
    });

    expect(
      settleArenaBet(reportWithWinner("B"), { amount: 40, side: "left" }),
    ).toEqual({
      payout: 0,
      status: "BET_LOST -40",
    });

    expect(
      settleArenaBet(reportWithWinner("DRAW"), { amount: 40, side: "left" }),
    ).toEqual({
      payout: 40,
      status: "STAKE_REFUNDED",
    });

    expect(
      settleArenaBet(reportWithWinner("A"), { amount: 0, side: "left" }),
    ).toEqual({
      payout: 0,
      status: "NO_STAKE",
    });
  });

  test("applies top-ups, refunds, and positive payouts to the wallet", () => {
    expect(topUpArenaWallet({ credits: 1, reputation: 10 })).toEqual({
      credits: 1 + CREDIT_TOP_UP_AMOUNT,
      reputation: 10,
    });

    expect(
      refundArenaLockedBet(
        { credits: 0, reputation: 50 },
        { amount: 25, side: "right" },
      ),
    ).toEqual({
      credits: BATTLE_CREDIT_COST,
      reputation: 75,
    });

    expect(
      applyArenaBetSettlement(
        { credits: 1, reputation: 50 },
        { payout: 80, status: "BET_WON +40" },
      ),
    ).toEqual({
      credits: 1,
      reputation: 130,
    });
  });
});
