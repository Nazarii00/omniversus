import type { BattleReportJson } from "@/features/battle-report";

import type { ArenaCardSide, CardCrtGlitchImpact } from "../model";

export const BATTLE_TIMELINE_STEP_MS = 1150;
export const BATTLE_SHOCK_PULSE_MS = 520;

export type BattleShockCue = {
  act: number;
  aHp: number;
  bHp: number;
  runId: number;
};

function clampBattleHp(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 100;

  return Math.max(0, Math.min(100, value));
}

export function battleShockCueCountForReport(
  report: BattleReportJson | null | undefined,
) {
  return Math.max(1, report?.narrative?.length ?? 1);
}

export function battleTimelineMsForReport(
  report: BattleReportJson | null | undefined,
) {
  return (
    (battleShockCueCountForReport(report) - 1) * BATTLE_TIMELINE_STEP_MS +
    BATTLE_SHOCK_PULSE_MS
  );
}

export function battleHpForCue(
  report: BattleReportJson | null | undefined,
  act: number,
) {
  const step = report?.narrative?.[act - 1];

  return {
    aHp: clampBattleHp(step?.a_hp),
    bHp: clampBattleHp(step?.b_hp),
  };
}

export function cardCrtImpactForSide(
  cue: BattleShockCue | null,
  side: ArenaCardSide,
): CardCrtGlitchImpact | null {
  if (!cue) return null;

  return {
    act: cue.act,
    hp: side === "left" ? cue.aHp : cue.bHp,
    runId: cue.runId,
  };
}

export function eliminatedCardSideForReport(
  report: BattleReportJson | null | undefined,
): ArenaCardSide | null {
  if (!report) return null;

  const winnerSide = report.verdict?.winner_side;

  if (winnerSide === "A") return "right";
  if (winnerSide === "B") return "left";

  const narrative = report.narrative;
  const finalStep = narrative?.[narrative.length - 1];
  const finalAHp = finalStep?.a_hp;
  const finalBHp = finalStep?.b_hp;

  if (typeof finalAHp === "number" && typeof finalBHp === "number") {
    if (finalAHp <= 0 && finalBHp > 0) return "left";
    if (finalBHp <= 0 && finalAHp > 0) return "right";
  }

  return null;
}
