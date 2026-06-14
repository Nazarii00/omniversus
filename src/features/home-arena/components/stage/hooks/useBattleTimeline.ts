"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
import usePageVisibility from "./usePageVisibility";

type BattleTimelineRun = {
  report: BattleReportJson | null | undefined;
  resolve: () => void;
};

export default function useBattleTimeline() {
  const battleTimelineTimeoutsRef = useRef<number[]>([]);
  const battleTimelineRunRef = useRef<BattleTimelineRun | null>(null);
  const savedReportRef = useRef<BattleReportJson | null | undefined>(null);
  const [battleShockCue, setBattleShockCue] = useState<BattleShockCue | null>(
    null,
  );
  const [battleEliminatedSide, setBattleEliminatedSide] =
    useState<ArenaCardSide | null>(null);
  const [battleGlitchResetToken, setBattleGlitchResetToken] = useState(0);
  const [isBattleOpenerActive, setIsBattleOpenerActive] = useState(false);
  const [isBattleTimelineActive, setIsBattleTimelineActive] = useState(false);

  const { isPageVisible, markAnimationStarted, wasEverVisibleSince } =
    usePageVisibility();

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

  const resetBattleTimeline = useCallback(() => {
    setBattleShockCue(null);
    setBattleEliminatedSide(null);
    setBattleGlitchResetToken((current) => current + 1);
    setIsBattleOpenerActive(false);
    setIsBattleTimelineActive(false);
    clearBattleTimelineTimeouts();
    resolveBattleTimelineRun();
  }, []);

  const startBattleTimeline = useCallback(
    (report: BattleReportJson | null | undefined) => {
      resetBattleTimeline();

      savedReportRef.current = report;
      markAnimationStarted();

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
    },
    [markAnimationStarted, resetBattleTimeline],
  );

  const skipBattleTimeline = useCallback(() => {
    const report = battleTimelineRunRef.current?.report;

    clearBattleTimelineTimeouts();
    setBattleShockCue(null);
    setBattleEliminatedSide(eliminatedCardSideForReport(report));
    setIsBattleOpenerActive(false);
    setIsBattleTimelineActive(false);
    resolveBattleTimelineRun();
  }, []);

  // Restart battle timeline when user returns to tab and hasn't seen the animation
  useEffect(() => {
    if (!isPageVisible) return;
    if (!isBattleTimelineActive) return;
    if (wasEverVisibleSince()) return;

    const report = savedReportRef.current;
    if (!report) return;

    // Reset and restart the timeline so the user sees it from the beginning
    clearBattleTimelineTimeouts();
    resolveBattleTimelineRun();

    const runId = Date.now();
    const shockCueCount = battleShockCueCountForReport(report);
    const timelineMs = battleTimelineMsForReport(report);

    setIsBattleTimelineActive(true);
    setIsBattleOpenerActive(true);
    markAnimationStarted();

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
    }, BATTLE_TIMELINE_OPENER_MS + timelineMs);

    battleTimelineTimeoutsRef.current.push(cleanupTimeoutId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Visibility-driven restart requires state sync.
  }, [isPageVisible]);

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
