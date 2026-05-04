"use client";

import { useEffect, useRef, useState } from "react";

type ButtonState = "idle" | "loading" | "armed";

export default function BattleStartButton() {
  const [state, setState] = useState<ButtonState>("idle");
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

  function startBattle() {
    if (state === "loading") {
      return;
    }

    clearPendingTimeout();
    setState("loading");

    timeoutRef.current = window.setTimeout(() => {
      setState("armed");

      timeoutRef.current = window.setTimeout(() => {
        setState("idle");
        timeoutRef.current = null;
      }, 650);
    }, 720);
  }

  const isLoading = state === "loading";
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
