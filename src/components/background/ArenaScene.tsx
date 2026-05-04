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
      glowRef.current.intensity = 0.7 + Math.sin(elapsed * 0.8) * 0.18;
    }
  });

  return (
    <>
      <gridHelper
        ref={floorGridRef}
        args={[64, 64, "#5d7f68", "#102018"]}
        position={[0, -2.5, -5]}
      />

      <gridHelper
        ref={ceilingGridRef}
        args={[64, 64, "#4c6f5b", "#0e1b15"]}
        position={[0, 2.5, -5]}
        rotation={[Math.PI, 0, 0]}
      />

      <pointLight
        ref={glowRef}
        position={[0, 0, -3]}
        intensity={0.7}
        color="#6f9a74"
        distance={12}
      />
      <pointLight
        position={[-4, 0, -2]}
        intensity={0.16}
        color="#70907c"
        distance={8}
      />
      <pointLight
        position={[4, 0, -2]}
        intensity={0.16}
        color="#70907c"
        distance={8}
      />
      <ambientLight intensity={0.035} color="#07120c" />

      <mesh position={[0, 0, -10]}>
        <planeGeometry args={[52, 52]} />
        <meshBasicMaterial color="#010403" />
      </mesh>
    </>
  );
}
