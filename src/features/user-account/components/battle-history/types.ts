export type BattleResult = "win" | "loss" | "draw";

export type Battle = {
  id: string;
  opponent: string;
  date: string; // "03.06"
  score: string; // "2:1"
  result: BattleResult;
};

export type MonthGroup = {
  label: string; // "ЧЕРВЕНЬ 2026"
  count: number;
  battles: Battle[];
};
