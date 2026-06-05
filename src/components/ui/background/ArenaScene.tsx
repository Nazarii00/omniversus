"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Timer, type GridHelper, type PointLight } from "three";

export default function ArenaScene() {
  const floorGridRef = useRef<GridHelper>(null);
  const ceilingGridRef = useRef<GridHelper>(null);
  const glowRef = useRef<PointLight>(null);
  const [timer] = useState(() => new Timer());

  useEffect(() => {
    timer.connect(document);

    return () => {
      timer.dispose();
    };
  }, [timer]);

  useFrame(() => {
    timer.update();

    const elapsed = timer.getElapsed();
    const drift = (elapsed * 0.32) % 1;

    if (floorGridRef.current) {
      floorGridRef.current.position.z = -5 + drift;
    }

    if (ceilingGridRef.current) {
      ceilingGridRef.current.position.z = -5 + drift;
    }

    if (glowRef.current) {
      glowRef.current.intensity = 0.58 + Math.sin(elapsed * 0.8) * 0.16;
    }
  });

  return (
    <>
      <gridHelper
        ref={floorGridRef}
        args={[64, 64, "#1a3a1a", "#0d2110"]}
        position={[0, -2.5, -5]}
      />

      <gridHelper
        ref={ceilingGridRef}
        args={[64, 64, "#183418", "#0a1a0d"]}
        position={[0, 2.5, -5]}
        rotation={[Math.PI, 0, 0]}
      />

      <pointLight
        ref={glowRef}
        position={[0, 0, -3]}
        intensity={0.58}
        color="#4eb44e"
        distance={12}
      />
      <pointLight
        position={[-4, 0, -2]}
        intensity={0.12}
        color="#2f7a35"
        distance={8}
      />
      <pointLight
        position={[4, 0, -2]}
        intensity={0.12}
        color="#2f7a35"
        distance={8}
      />
      <ambientLight intensity={0.03} color="#071807" />

      <mesh position={[0, 0, -10]}>
        <planeGeometry args={[52, 52]} />
        <meshBasicMaterial color="#010403" />
      </mesh>
    </>
  );
}
