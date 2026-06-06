"use client";

import { useEffect, useRef, useState } from "react";

import type { BattleReportJson } from "@/features/battle-report";

import {
  BATTLE_TIMELINE_STEP_MS,
  BATTLE_TIMELINE_OPENER_MS,
  battleHpForCue,
  battleShockCueCountForReport,
  battleTimelineMsForReport,
  cardCrtImpactForSide,
  eliminatedCardSideForReport,
  type BattleShockCue,
} from "../../../logic";
import type { ArenaCardSide } from "../../../model";

type BattleTimelineRun = {
  report: BattleReportJson | null | undefined;
  resolve: () => void;
};

export default function useBattleTimeline() {
  const battleTimelineTimeoutsRef = useRef<number[]>([]);
  const battleTimelineRunRef = useRef<BattleTimelineRun | null>(null);
  const [battleShockCue, setBattleShockCue] = useState<BattleShockCue | null>(
    null,
  );
  const [battleEliminatedSide, setBattleEliminatedSide] =
    useState<ArenaCardSide | null>(null);
  const [battleGlitchResetToken, setBattleGlitchResetToken] = useState(0);
  const [isBattleOpenerActive, setIsBattleOpenerActive] = useState(false);
  const [isBattleTimelineActive, setIsBattleTimelineActive] = useState(false);

  function clearBattleTimelineTimeouts() {
    for (const timeoutId of battleTimelineTimeoutsRef.current) {
      window.clearTimeout(timeoutId);
    }

    battleTimelineTimeoutsRef.current = [];
  }

  function resolveBattleTimelineRun() {
    const run = battleTimelineRunRef.current;
    if (!run) return;

    battleTimelineRunRef.current = null;
    run.resolve();
  }

  function resetBattleTimeline() {
    setBattleShockCue(null);
    setBattleEliminatedSide(null);
    setBattleGlitchResetToken((current) => current + 1);
    setIsBattleOpenerActive(false);
    setIsBattleTimelineActive(false);
    clearBattleTimelineTimeouts();
    resolveBattleTimelineRun();
  }

  function startBattleTimeline(report: BattleReportJson | null | undefined) {
    resetBattleTimeline();

    const runId = Date.now();
    const shockCueCount = battleShockCueCountForReport(report);
    const timelineMs = battleTimelineMsForReport(report);

    setIsBattleTimelineActive(true);
    setIsBattleOpenerActive(true);

    return new Promise<void>((resolve) => {
      battleTimelineRunRef.current = { report, resolve };

      const openerTimeoutId = window.setTimeout(() => {
        setIsBattleOpenerActive(false);
      }, BATTLE_TIMELINE_OPENER_MS);

      battleTimelineTimeoutsRef.current.push(openerTimeoutId);

      for (let act = 1; act <= shockCueCount; act += 1) {
        const timeoutId = window.setTimeout(
          () => {
            setBattleShockCue({ act, runId, ...battleHpForCue(report, act) });
          },
          BATTLE_TIMELINE_OPENER_MS + (act - 1) * BATTLE_TIMELINE_STEP_MS,
        );

        battleTimelineTimeoutsRef.current.push(timeoutId);
      }

      const cleanupTimeoutId = window.setTimeout(() => {
        clearBattleTimelineTimeouts();
        setBattleShockCue(null);
        setBattleEliminatedSide(eliminatedCardSideForReport(report));
        setIsBattleOpenerActive(false);
        setIsBattleTimelineActive(false);
        resolveBattleTimelineRun();
      }, BATTLE_TIMELINE_OPENER_MS + timelineMs);

      battleTimelineTimeoutsRef.current.push(cleanupTimeoutId);
    });
  }

  function skipBattleTimeline() {
    const report = battleTimelineRunRef.current?.report;

    clearBattleTimelineTimeouts();
    setBattleShockCue(null);
    setBattleEliminatedSide(eliminatedCardSideForReport(report));
    setIsBattleOpenerActive(false);
    setIsBattleTimelineActive(false);
    resolveBattleTimelineRun();
  }

  useEffect(() => {
    return () => {
      clearBattleTimelineTimeouts();
      resolveBattleTimelineRun();
    };
  }, []);

  return {
    battleEliminatedSide,
    battleGlitchResetToken,
    battleShockCue,
    isBattleOpenerActive,
    isBattleTimelineActive,
    leftCrtImpact: cardCrtImpactForSide(battleShockCue, "left"),
    resetBattleTimeline,
    rightCrtImpact: cardCrtImpactForSide(battleShockCue, "right"),
    skipBattleTimeline,
    startBattleTimeline,
  };
}
