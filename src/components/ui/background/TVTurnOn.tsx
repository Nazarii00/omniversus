"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

type TurnOnPhase = "off" | "line" | "expand" | "flicker" | "done";
type PhaseListener = (phase: TurnOnPhase) => void;

type TVTurnOnProps = {
  onDone: () => void;
};

let activePhase: TurnOnPhase = "off";
let hasStartedTurnOn = false;
const phaseListeners = new Set<PhaseListener>();
let turnOnTimeoutIds: number[] = [];

function emitPhase(phase: TurnOnPhase) {
  activePhase = phase;
  phaseListeners.forEach((listener) => listener(phase));
}

function subscribeToTurnOn(listener: PhaseListener) {
  phaseListeners.add(listener);
  listener(activePhase);

  return () => {
    phaseListeners.delete(listener);
  };
}

function queuePhase(phase: TurnOnPhase, delayMs: number) {
  const timeoutId = window.setTimeout(() => {
    turnOnTimeoutIds = turnOnTimeoutIds.filter((id) => id !== timeoutId);
    emitPhase(phase);
  }, delayMs);

  turnOnTimeoutIds.push(timeoutId);
}

function clearQueuedPhases() {
  for (const timeoutId of turnOnTimeoutIds) {
    window.clearTimeout(timeoutId);
  }

  turnOnTimeoutIds = [];
}

export function isTurnOnDone() {
  return activePhase === "done";
}

export function completeTurnOn() {
  clearQueuedPhases();
  hasStartedTurnOn = true;
  emitPhase("done");
}

function startTurnOn() {
  if (hasStartedTurnOn) {
    return;
  }

  hasStartedTurnOn = true;

  queuePhase("line", 200);
  queuePhase("expand", 500);
  queuePhase("flicker", 1000);
  queuePhase("done", 1400);
}

export default function TVTurnOn({ onDone }: TVTurnOnProps) {
  const [phase, setPhase] = useState<TurnOnPhase>(activePhase);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const unsubscribe = subscribeToTurnOn(setPhase);
    startTurnOn();

    return unsubscribe;
  }, []);

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        completeTurnOn();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && hasStartedTurnOn) {
        completeTurnOn();
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (phase === "done") {
      onDoneRef.current();
    }
  }, [phase]);

  if (phase === "done") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] bg-black pointer-events-none origin-center"
      style={getPhaseStyle(phase)}
    />
  );
}

function getPhaseStyle(phase: Exclude<TurnOnPhase, "done">): CSSProperties {
  if (phase === "line") {
    return {
      opacity: 1,
      transform: "scaleY(0.004)",
      transition: "transform 250ms ease-out",
      boxShadow: "0 0 40px 15px rgba(0, 255, 136, 0.6)",
    };
  }

  if (phase === "expand") {
    return {
      opacity: 1,
      transform: "scaleY(1)",
      transition: "transform 450ms cubic-bezier(0.23, 1, 0.32, 1)",
      backgroundColor: "rgba(0, 20, 10, 0.95)",
      boxShadow: "0 0 60px 20px rgba(0, 255, 136, 0.3)",
    };
  }

  if (phase === "flicker") {
    return {
      opacity: 0,
      transition: "opacity 150ms ease-out",
    };
  }

  return {
    opacity: 1,
    transform: "scaleY(1)",
  };
}
