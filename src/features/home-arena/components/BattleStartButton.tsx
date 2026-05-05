"use client";

import { useEffect, useRef, useState } from "react";

type ButtonState = "idle" | "loading" | "armed";

// TEMP_BATTLE_API_TEST: delete this object and the fetch block in startBattle
// when the real combatant picker is wired.
const TEMP_BATTLE_API_TEST = {
  fighterA: "Jesus",
  fighterB: "Allah",
  options: {
    outputLanguage: "en",
  },
} as const;

export default function BattleStartButton() {
  const [state, setState] = useState<ButtonState>("idle");
  const [isRequestPending, setIsRequestPending] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  function clearPendingTimeout() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  useEffect(() => {
    return clearPendingTimeout;
  }, []);

  async function startBattle() {
    if (state === "loading" || isRequestPending) {
      return;
    }

    clearPendingTimeout();
    setState("loading");
    setIsRequestPending(true);

    timeoutRef.current = window.setTimeout(() => {
      setState("armed");

      timeoutRef.current = window.setTimeout(() => {
        setState("idle");
        timeoutRef.current = null;
      }, 650);
    }, 720);

    // TEMP_BATTLE_API_TEST: browser-console-only test request.
    try {
      console.info("[TEMP_BATTLE_API_TEST] request", TEMP_BATTLE_API_TEST);

      const response = await fetch("/api/battle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(TEMP_BATTLE_API_TEST),
      });

      const data: unknown = await response.json();

      console.info("[TEMP_BATTLE_API_TEST] response status", response.status);
      console.log("[TEMP_BATTLE_API_TEST] response body", data);
    } catch (error) {
      console.error("[TEMP_BATTLE_API_TEST] request failed", error);
    } finally {
      setIsRequestPending(false);
    }
  }

  const isLoading = state === "loading" || isRequestPending;
  const label =
    state === "armed" ? "EXECUTED" : isLoading ? "EXECUTING" : "EXECUTE_BATTLE";

  return (
    <button
      type="button"
      aria-busy={isLoading}
      disabled={isLoading}
      onClick={startBattle}
      className="home-battle-button relative grid h-14 w-[min(76vw,12.5rem)] place-items-center overflow-hidden border border-[#1a3a1a] bg-black/84 px-5 text-center text-[0.72rem] font-bold uppercase leading-tight tracking-[0.1em] text-[#68b768] outline-none transition-colors duration-150 disabled:cursor-wait sm:w-52 sm:text-[0.78rem]"
      data-state={state}
    >
      <span className="home-battle-button__load" aria-hidden="true" />
      <span className="relative z-10">{label}</span>
    </button>
  );
}
