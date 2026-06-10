"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CoinFlightAnimationProps = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  coinCount?: number;
  onComplete?: () => void;
};

const COIN_SYMBOLS = ["◈", "◆", "◇", "●", "◉", "$"];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function generateParticles(
  count: number,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) {
  const driftX = targetX - sourceX;
  const driftY = targetY - sourceY;

  return Array.from({ length: count }, (_, i) => {
    const arcHeight = randomBetween(-80, -180);
    const midDriftX = driftX + randomBetween(-60, 60);
    const midDriftY = driftY + arcHeight;
    const delay = randomBetween(0, 0.25);
    const duration = randomBetween(1.0, 1.5);
    const spinStart = randomBetween(-45, 45);
    const sizeOffset = randomBetween(-2, 4);

    return {
      id: i,
      symbol: COIN_SYMBOLS[Math.floor(Math.random() * COIN_SYMBOLS.length)],
      style: {
        "--drift-x": `${driftX}px`,
        "--drift-y": `${driftY}px`,
        "--mid-x": `${midDriftX}px`,
        "--mid-y": `${midDriftY}px`,
        "--flight-delay": `${delay}s`,
        "--flight-duration": `${duration}s`,
        "--spin-start": `${spinStart}deg`,
        left: `${sourceX}px`,
        top: `${sourceY}px`,
        width: `${14 + sizeOffset}px`,
        height: `${14 + sizeOffset}px`,
        fontSize: `${10 + sizeOffset * 0.5}px`,
      } as React.CSSProperties,
    };
  });
}

export default function CoinFlightAnimation({
  sourceX,
  sourceY,
  targetX,
  targetY,
  coinCount = 12,
  onComplete,
}: CoinFlightAnimationProps) {
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longestDuration = 1.5 + 0.25;

  const particles = useMemo(
    () => generateParticles(coinCount, sourceX, sourceY, targetX, targetY),
    [coinCount, sourceX, sourceY, targetX, targetY],
  );

  useEffect(() => {
    timeoutRef.current = setTimeout(
      () => {
        setVisible(false);
        onComplete?.();
      },
      longestDuration * 1000 + 200,
    );

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [longestDuration, onComplete]);

  if (!visible) return null;

  return (
    <div className="coin-flight-overlay" aria-hidden="true">
      {particles.map((p) => (
        <span key={p.id} className="coin-flight-particle" style={p.style}>
          {p.symbol}
        </span>
      ))}
    </div>
  );
}
