import type { BattleReportJson } from "@/features/battle-report";

import type {
  ArenaBetDraft,
  ArenaBetSettlement,
  ArenaLockedBet,
  ArenaWallet,
} from "../model";

export const ARENA_WALLET_STORAGE_KEY = "omniversus.arenaWallet";
export const BATTLE_CREDIT_COST = 1;
export const CREDIT_TOP_UP_AMOUNT = 5;

export const DEFAULT_ARENA_WALLET: ArenaWallet = {
  credits: 8,
  reputation: 1250,
};

export const DEFAULT_ARENA_BET: ArenaBetDraft = {
  amountText: "",
  side: "left",
};

type ArenaBetLockResult =
  | {
      lockedBet: ArenaLockedBet;
      status: string;
      wallet: ArenaWallet;
      ok: true;
    }
  | {
      message: string;
      reason: "LOW_REPUTATION" | "NO_CREDITS";
      ok: false;
    };

export function readStoredArenaWallet(): ArenaWallet {
  if (typeof window === "undefined") return DEFAULT_ARENA_WALLET;

  try {
    const storedWallet = window.localStorage.getItem(ARENA_WALLET_STORAGE_KEY);
    if (!storedWallet) return DEFAULT_ARENA_WALLET;

    return normalizeArenaWallet(JSON.parse(storedWallet));
  } catch {
    return DEFAULT_ARENA_WALLET;
  }
}

export function writeStoredArenaWallet(wallet: ArenaWallet) {
  if (typeof window === "undefined") return;

  try {
    const nextWalletText = JSON.stringify(normalizeArenaWallet(wallet));

    if (window.localStorage.getItem(ARENA_WALLET_STORAGE_KEY) === nextWalletText)
      return;

    window.localStorage.setItem(ARENA_WALLET_STORAGE_KEY, nextWalletText);
  } catch {
    // Ignore blocked storage; the in-memory wallet still works.
  }
}

export function normalizeArenaWallet(value: unknown): ArenaWallet {
  const wallet =
    value && typeof value === "object"
      ? (value as Partial<ArenaWallet>)
      : DEFAULT_ARENA_WALLET;

  return {
    credits: clampWalletNumber(wallet.credits, DEFAULT_ARENA_WALLET.credits),
    reputation: clampWalletNumber(
      wallet.reputation,
      DEFAULT_ARENA_WALLET.reputation,
    ),
  };
}

export function topUpArenaWallet(wallet: ArenaWallet): ArenaWallet {
  const normalizedWallet = normalizeArenaWallet(wallet);

  return {
    ...normalizedWallet,
    credits: normalizedWallet.credits + CREDIT_TOP_UP_AMOUNT,
  };
}

export function lockArenaBet(
  wallet: ArenaWallet,
  bet: ArenaBetDraft,
): ArenaBetLockResult {
  const normalizedWallet = normalizeArenaWallet(wallet);
  const lockedBet: ArenaLockedBet = {
    amount: parseArenaBetAmount(bet.amountText),
    side: bet.side,
  };

  if (normalizedWallet.credits < BATTLE_CREDIT_COST) {
    return {
      message: "Not enough credits to execute battle.",
      reason: "NO_CREDITS",
      ok: false,
    };
  }

  if (lockedBet.amount > normalizedWallet.reputation) {
    return {
      message: "Not enough reputation for this stake.",
      reason: "LOW_REPUTATION",
      ok: false,
    };
  }

  return {
    lockedBet,
    status:
      lockedBet.amount > 0 ? `STAKE_LOCKED -${lockedBet.amount}` : "NO_STAKE",
    wallet: {
      credits: Math.max(0, normalizedWallet.credits - BATTLE_CREDIT_COST),
      reputation: Math.max(0, normalizedWallet.reputation - lockedBet.amount),
    },
    ok: true,
  };
}

export function refundArenaLockedBet(
  wallet: ArenaWallet,
  bet: ArenaLockedBet,
): ArenaWallet {
  const normalizedWallet = normalizeArenaWallet(wallet);

  return {
    credits: normalizedWallet.credits + BATTLE_CREDIT_COST,
    reputation: normalizedWallet.reputation + bet.amount,
  };
}

export function applyArenaBetSettlement(
  wallet: ArenaWallet,
  settlement: ArenaBetSettlement,
): ArenaWallet {
  const normalizedWallet = normalizeArenaWallet(wallet);

  if (settlement.payout <= 0) return normalizedWallet;

  return {
    ...normalizedWallet,
    reputation: normalizedWallet.reputation + settlement.payout,
  };
}

export function parseArenaBetAmount(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) return 0;

  return Math.floor(amount);
}

export function settleArenaBet(
  report: BattleReportJson,
  bet: ArenaLockedBet,
): ArenaBetSettlement {
  if (bet.amount <= 0) {
    return {
      payout: 0,
      status: "NO_STAKE",
    };
  }

  const winnerSide = report.verdict?.winner_side;
  const winningCardSide =
    winnerSide === "A" ? "left" : winnerSide === "B" ? "right" : null;

  if (!winningCardSide) {
    return {
      payout: bet.amount,
      status: "STAKE_REFUNDED",
    };
  }

  if (winningCardSide === bet.side) {
    return {
      payout: bet.amount * 2,
      status: `BET_WON +${bet.amount}`,
    };
  }

  return {
    payout: 0,
    status: `BET_LOST -${bet.amount}`,
  };
}

function clampWalletNumber(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;

  return Math.max(0, Math.floor(value));
}
