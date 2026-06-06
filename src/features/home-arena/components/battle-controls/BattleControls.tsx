"use client";

import { useEffect, useRef, useState } from "react";

import BattleStartButton, {
  type BattleStartButtonState,
} from "./BattleStartButton";

const EXECUTED_HOLD_MS = 650;

type BattleControlsProps = {
  canStart?: boolean;
  disabledLabel?: string;
  fighterA: string | null;
  fighterB: string | null;
  onBattleStart: () => Promise<void>;
};

export default function BattleControls({
  canStart: canStartOverride = true,
  disabledLabel = "ENTER_2_NAMES",
  fighterA,
  fighterB,
  onBattleStart,
}: BattleControlsProps) {
  const [buttonState, setButtonState] =
    useState<BattleStartButtonState>("idle");
  const timeoutRefs = useRef<number[]>([]);

  function clearPendingTimeouts() {
    for (const timeoutId of timeoutRefs.current) {
      window.clearTimeout(timeoutId);
    }

    timeoutRefs.current = [];
  }

  function queueTimeout(callback: () => void, delayMs: number) {
    const timeoutId = window.setTimeout(() => {
      timeoutRefs.current = timeoutRefs.current.filter(
        (id) => id !== timeoutId,
      );
      callback();
    }, delayMs);

    timeoutRefs.current.push(timeoutId);
  }

  useEffect(() => {
    return clearPendingTimeouts;
  }, []);

  const canStart =
    Boolean(fighterA?.trim() && fighterB?.trim()) && canStartOverride;

  async function startBattle() {
    if (
      buttonState === "loading" ||
      !fighterA?.trim() ||
      !fighterB?.trim() ||
      !canStartOverride
    ) {
      return;
    }

    clearPendingTimeouts();
    setButtonState("loading");

    try {
      await onBattleStart();
      setButtonState("armed");

      queueTimeout(() => {
        setButtonState("idle");
      }, EXECUTED_HOLD_MS);
    } catch {
      setButtonState("idle");
    }
  }

  return (
    <BattleStartButton
      state={buttonState}
      disabled={!canStart}
      disabledLabel={disabledLabel}
      onStart={startBattle}
    />
  );
}
