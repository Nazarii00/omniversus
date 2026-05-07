"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import ArenaScene from "./ArenaScene";
import TVTurnOn, { isTurnOnDone } from "./TVTurnOn";

type CRTBackgroundProps = {
  children?: ReactNode;
};

export default function CRTBackground({ children }: CRTBackgroundProps) {
  const [ready, setReady] = useState(() => isTurnOnDone());

  useEffect(() => {
    const fallbackId = window.setTimeout(() => setReady(true), 1800);

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        setReady(true);
      }
    }

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.clearTimeout(fallbackId);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#010201]">
      <div className="fixed inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 60 }}
          gl={{ antialias: true }}
        >
          <ArenaScene />
        </Canvas>
      </div>

      <div
        aria-hidden="true"
        className="fixed inset-0 z-[1] pointer-events-none bg-[radial-gradient(circle,rgba(14,28,12,0.04)_36%,rgba(0,0,0,0.92)_100%)] shadow-[inset_0_0_130px_rgba(0,0,0,0.95)]"
      />

      <div
        aria-hidden="true"
        className="fixed inset-0 z-[2] pointer-events-none opacity-[0.11] mix-blend-screen [background-image:linear-gradient(rgba(78,180,78,0.18)_1px,transparent_1px)] [background-size:100%_5px]"
      />

      {children ? (
        <div
          className="relative z-10 transition-opacity duration-500"
          style={{ opacity: ready ? 1 : 0 }}
        >
          {children}
        </div>
      ) : null}

      <TVTurnOn onDone={() => setReady(true)} />
    </div>
  );
}
