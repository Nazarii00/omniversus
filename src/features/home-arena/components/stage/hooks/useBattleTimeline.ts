"use client";

import { useEffect, useRef, useState } from "react";

import type { BattleReportJson } from "@/features/battle-report";

import {
  BATTLE_SHOCK_CUE_COUNT,
  BATTLE_TIMELINE_MS,
  BATTLE_TIMELINE_STEP_MS,
  battleHpForCue,
  cardCrtImpactForSide,
  eliminatedCardSideForReport,
  type BattleShockCue,
} from "../../../logic";
import type { ArenaCardSide } from "../../../model";

export default function useBattleTimeline() {
  const battleTimelineTimeoutsRef = useRef<number[]>([]);
  const [battleShockCue, setBattleShockCue] = useState<BattleShockCue | null>(
    null,
  );
  const [battleEliminatedSide, setBattleEliminatedSide] =
    useState<ArenaCardSide | null>(null);
  const [battleGlitchResetToken, setBattleGlitchResetToken] = useState(0);
  const [isBattleTimelineActive, setIsBattleTimelineActive] = useState(false);
  const [battleSkipToken, setBattleSkipToken] = useState(0);

  function clearBattleTimelineTimeouts() {
    for (const timeoutId of battleTimelineTimeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }

    battleTimelineTimeoutsRef.current = [];
  }

  function resetBattleTimeline() {
    setBattleShockCue(null);
    setBattleEliminatedSide(null);
    setBattleGlitchResetToken((current) => current + 1);
    setIsBattleTimelineActive(false);
    clearBattleTimelineTimeouts();
  }

  function startBattleTimeline(report: BattleReportJson | null | undefined) {
    resetBattleTimeline();

    const runId = Date.now();
    setIsBattleTimelineActive(true);

    for (let act = 1; act <= BATTLE_SHOCK_CUE_COUNT; act += 1) {
      const timeoutId = window.setTimeout(
        () => {
          setBattleShockCue({ act, runId, ...battleHpForCue(act) });
        },
        (act - 1) * BATTLE_TIMELINE_STEP_MS,
      );

      battleTimelineTimeoutsRef.current.push(timeoutId);
    }

    const cleanupTimeoutId = window.setTimeout(() => {
      setBattleShockCue(null);
      setBattleEliminatedSide(eliminatedCardSideForReport(report));
      setIsBattleTimelineActive(false);
    }, BATTLE_TIMELINE_MS);

    battleTimelineTimeoutsRef.current.push(cleanupTimeoutId);

    return BATTLE_TIMELINE_MS;
  }

  function skipBattleTimeline() {
    clearBattleTimelineTimeouts();
    setBattleShockCue(null);
    setBattleEliminatedSide(null);
    setIsBattleTimelineActive(false);
    setBattleSkipToken((current) => current + 1);
  }

  useEffect(() => {
    return clearBattleTimelineTimeouts;
  }, []);

  return {
    battleEliminatedSide,
    battleGlitchResetToken,
    battleShockCue,
    battleSkipToken,
    isBattleTimelineActive,
    leftCrtImpact: cardCrtImpactForSide(battleShockCue, "left"),
    resetBattleTimeline,
    rightCrtImpact: cardCrtImpactForSide(battleShockCue, "right"),
    skipBattleTimeline,
    startBattleTimeline,
  };
}
