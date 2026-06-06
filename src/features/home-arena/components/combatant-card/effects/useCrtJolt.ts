"use client";

import { useEffect, useRef } from "react";

const CRT_JOLT_ANIMATION_MS = 460;

type CrtHitPhase = "odd" | "even";

export default function useCrtJolt(crtImpactKey: string | null) {
  const joltShellRef = useRef<HTMLDivElement | null>(null);
  const crtHitSequenceRef = useRef(0);

  useEffect(() => {
    const joltShell = joltShellRef.current;
    if (!joltShell) return;

    if (!crtImpactKey) {
      joltShell.removeAttribute("data-crt-hit-phase");
      return;
    }

    crtHitSequenceRef.current += 1;
    const nextHitPhase: CrtHitPhase =
      crtHitSequenceRef.current % 2 === 0 ? "even" : "odd";

    joltShell.removeAttribute("data-crt-hit-phase");
    joltShell.style.animation = "none";
    void joltShell.offsetWidth;
    joltShell.style.animation = "";
    joltShell.setAttribute("data-crt-hit-phase", nextHitPhase);

    const timeoutId = window.setTimeout(() => {
      if (joltShell.getAttribute("data-crt-hit-phase") === nextHitPhase) {
        joltShell.removeAttribute("data-crt-hit-phase");
      }
    }, CRT_JOLT_ANIMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [crtImpactKey]);

  return joltShellRef;
}
