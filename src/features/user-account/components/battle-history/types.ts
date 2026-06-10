export type BattleResult = "win" | "loss" | "draw";

export type BattleMode = "1v1" | "2v2" | "FFA" | "CUSTOM";

export type Battle = {
  id: string;
  battleNumber: number;
  fighterA: string;
  fighterB: string;
  mode: BattleMode;
  date: string; // "03.06" or "2026-06-03"
  result: BattleResult;
  wager?: number;
};

export type MonthGroup = {
  label: string; // "JUNE 2026"
  count: number;
  battles: Battle[];
};

export type FilterState = {
  result: BattleResult | "all";
  search: string;
  sort: "newest" | "oldest";
};
