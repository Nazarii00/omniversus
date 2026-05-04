"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import ArenaScene from "./ArenaScene";
import TVTurnOn from "./TVTurnOn";

type CRTBackgroundProps = {
  children?: ReactNode;
};

export default function CRTBackground({ children }: CRTBackgroundProps) {
  const [ready, setReady] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020403]">
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
        className="fixed inset-0 z-[1] pointer-events-none bg-[radial-gradient(circle,rgba(0,0,0,0.05)_42%,rgba(0,0,0,0.9)_100%)] shadow-[inset_0_0_130px_rgba(0,0,0,0.94)]"
      />

      <div
        aria-hidden="true"
        className="fixed inset-0 z-[2] pointer-events-none opacity-[0.09] mix-blend-screen [background-image:linear-gradient(rgba(120,160,128,0.22)_1px,transparent_1px)] [background-size:100%_5px]"
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
