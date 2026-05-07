"use client";

import { useEffect, useRef, useState } from "react";

import {
  requestBattleReport,
  type BattleReportJson,
} from "@/features/battle-report";
import BattleStartButton, {
  type BattleStartButtonState,
} from "./BattleStartButton";
import { getBattleLoadingSequenceMs } from "./BattleLoadingConsole";

const EXECUTED_HOLD_MS = 650;

type BattleControlsProps = {
  fighterA: string | null;
  fighterB: string | null;
  onBattleStart: () => void;
  onReportReady: (report: BattleReportJson) => void;
  onBattleError: (message: string) => void;
};

export default function BattleControls({
  fighterA,
  fighterB,
  onBattleStart,
  onReportReady,
  onBattleError,
}: BattleControlsProps) {
  const [buttonState, setButtonState] =
    useState<BattleStartButtonState>("idle");
  const timeoutRefs = useRef<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const canStart = Boolean(fighterA?.trim() && fighterB?.trim());

  function clearPendingTimeouts() {
    for (const timeoutId of timeoutRefs.current) {
      window.clearTimeout(timeoutId);
    }

    timeoutRefs.current = [];
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function queueTimeout(callback: () => void, delayMs: number) {
    const timeoutId = window.setTimeout(() => {
      timeoutRefs.current = timeoutRefs.current.filter((id) => id !== timeoutId);
      callback();
    }, delayMs);

    timeoutRefs.current.push(timeoutId);
  }

  useEffect(() => {
    return clearPendingTimeouts;
  }, []);

  function delay(ms: number) {
    return new Promise((resolve) => {
      queueTimeout(() => resolve(undefined), ms);
    });
  }

  function readErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Battle request failed";
  }

  async function startBattle() {
    if (buttonState === "loading" || !fighterA?.trim() || !fighterB?.trim()) {
      return;
    }

    clearPendingTimeouts();
    onBattleStart();
    setButtonState("loading");
    const abortController = new AbortController();
    abortRef.current = abortController;
    const trimmedFighterA = fighterA.trim();
    const trimmedFighterB = fighterB.trim();
    const minimumConsoleMs = getBattleLoadingSequenceMs(
      trimmedFighterA,
      trimmedFighterB,
    );

    try {
      const [report] = await Promise.all([
        requestBattleReport({
          fighterA: trimmedFighterA,
          fighterB: trimmedFighterB,
          signal: abortController.signal,
        }),
        delay(minimumConsoleMs),
      ]);

      abortRef.current = null;
      setButtonState("armed");
      onReportReady(report);

      queueTimeout(() => {
        setButtonState("idle");
      }, EXECUTED_HOLD_MS);
    } catch (error) {
      if (abortController.signal.aborted) {
        return;
      }

      abortRef.current = null;
      setButtonState("idle");
      onBattleError(readErrorMessage(error));
    }
  }

  return (
    <BattleStartButton
      state={buttonState}
      disabled={!canStart}
      disabledLabel="ENTER_2_NAMES"
      onStart={startBattle}
    />
  );
}
