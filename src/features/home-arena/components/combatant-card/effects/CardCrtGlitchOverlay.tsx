"use client";

import { useEffect, useRef, useState } from "react";
import type { ArenaCardSide, CardCrtGlitchImpact } from "../../../model";

type CardCrtGlitchOverlayProps = {
  impact?: CardCrtGlitchImpact | null;
  isTerminal?: boolean;
  resetToken?: number;
  side: ArenaCardSide;
};

type CheckerboardState = {
  nextFlip: number;
  x: number;
  y: number;
};

const GLITCH_COLORS = [
  "#ff00aa",
  "#00ffff",
  "#ffff00",
  "#ff0033",
  "#00ff88",
  "#aa00ff",
  "#ff8800",
  "#ffffff",
  "#ff00ff",
  "#00ff00",
];

const SNOW_COLORS = [
  "#ff0000",
  "#00ff00",
  "#0055ff",
  "#ff00ff",
  "#00ffff",
  "#ffff00",
];

function rn(seed: number) {
  return Math.abs(Math.sin(seed * 127.1 + 31.41) * 43758.5453) % 1;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampHp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, 0, 100)
    : 100;
}

function updateCheckerboardState(
  state: CheckerboardState,
  frame: number,
  width: number,
  height: number,
  damage: number,
) {
  if (frame < state.nextFlip) return;

  const holdFrames = Math.floor(lerp(180, 80, damage) + Math.random() * 80);
  state.nextFlip = frame + holdFrames;
  state.x = Math.random() * Math.max(1, width - 90);
  state.y = Math.random() * height * 0.72;
}

function drawVignette(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = context.createRadialGradient(
    width / 2,
    height * 0.45,
    height * 0.15,
    width / 2,
    height * 0.45,
    height * 0.7,
  );

  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.46)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawCardCrtGlitch(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  hpValue: number,
  pulseValue: number,
  seed: number,
  frame: number,
  checkerboardState: CheckerboardState,
  isRightSide: boolean,
  pixelRatio: number,
) {
  const rawDamage = clamp((100 - hpValue) / 100, 0, 1);
  const damage = rawDamage > 0 ? clamp(0.1 + rawDamage * 1.18, 0, 1) : 0;
  const hit = clamp(pulseValue, 0, 1);
  const total = clamp(damage + hit * 0.85, 0, 1);
  const time = frame * 0.02;

  context.clearRect(0, 0, width, height);

  if (total < 0.015) return;

  const lateStatic = clamp((damage - 0.32) / 0.68, 0, 1);
  const snowCount = Math.floor(
    lerp(10, 320, damage * damage) + lateStatic * 110 + hit * 320,
  );
  const snowAlpha = lerp(0.1, 0.98, damage) + lateStatic * 0.18 + hit * 0.22;
  const fineStaticCount = Math.floor((width * height * lateStatic) / 180);
  const fineStaticAlpha = lerp(0.16, 0.42, lateStatic);

  context.save();

  for (let index = 0; index < snowCount; index += 1) {
    const snowSeed = seed + index * 3.7 + frame * 0.25;

    context.globalAlpha = snowAlpha * (rn(snowSeed + 0.6) * 0.5 + 0.5);
    context.fillStyle =
      SNOW_COLORS[Math.floor(rn(snowSeed + 0.5) * SNOW_COLORS.length)];
    context.fillRect(
      rn(snowSeed + 0.1) * width,
      rn(snowSeed + 0.2) * height * 0.78,
      1 + rn(snowSeed + 0.3) * lerp(1, 4, damage),
      1 + rn(snowSeed + 0.4) * lerp(1, 3, damage),
    );
  }

  context.restore();

  if (fineStaticCount > 0) {
    context.save();

    for (let index = 0; index < fineStaticCount; index += 1) {
      const staticSeed = seed + 700 + index * 1.91 + frame * 0.41;
      const flicker = rn(staticSeed + 0.6) * 0.55 + 0.45;
      const pixelSize = rn(staticSeed + 0.7) > 0.94 ? 2 : 1;

      context.globalAlpha = fineStaticAlpha * flicker;
      context.fillStyle =
        rn(staticSeed + 0.8) > 0.72
          ? SNOW_COLORS[Math.floor(rn(staticSeed + 0.9) * SNOW_COLORS.length)]
          : "rgba(210, 230, 205, 0.86)";
      context.fillRect(
        rn(staticSeed + 0.1) * width,
        rn(staticSeed + 0.2) * height * lerp(0.82, 0.98, lateStatic),
        pixelSize,
        pixelSize,
      );
    }

    context.restore();
  }

  const bandCount = Math.floor(lerp(1, isRightSide ? 12 : 16, total));

  for (let index = 0; index < bandCount; index += 1) {
    const bandSeed =
      seed +
      index * 23 +
      Math.floor(time * 0.5 + index * 0.8) * (1 + Math.floor(damage * 4));
    const y =
      (rn(bandSeed + 0.05) * height +
        time * lerp(0, 10, damage) * (index % 2 ? 1 : -1)) %
      height;
    const bandHeight =
      lerp(1, isRightSide ? 9 : 13, rn(bandSeed + 0.2)) * (1 + damage * 2.2);
    const alpha = lerp(0.55, 1, total) * (rn(bandSeed + 0.3) * 0.44 + 0.56);
    const jaggedness = Math.floor(total * 9);

    context.save();
    context.globalAlpha = alpha;

    if (jaggedness > 1) {
      const steps = 10 + jaggedness * 3;
      context.beginPath();

      for (let step = 0; step <= steps; step += 1) {
        const x = (step / steps) * width;
        const jitter =
          (rn(bandSeed + step * 0.07 + 0.1) - 0.5) * jaggedness * 3;

        if (step === 0) {
          context.moveTo(x, y + jitter);
        } else {
          context.lineTo(x, y + jitter);
        }
      }

      for (let step = steps; step >= 0; step -= 1) {
        const x = (step / steps) * width;
        const jitter =
          (rn(bandSeed + step * 0.07 + 0.5) - 0.5) * jaggedness * 3;
        context.lineTo(x, y + bandHeight + jitter);
      }

      context.closePath();
      context.fillStyle = "#000";
      context.fill();
    } else {
      context.fillStyle = "#000";
      context.fillRect(0, y, width, bandHeight);
    }

    context.restore();

    if (damage > 0.12 && rn(bandSeed + 0.88) > 0.38) {
      context.save();
      context.globalAlpha =
        (damage - 0.12) * 0.9 * (rn(bandSeed + 0.6) * 0.5 + 0.5);

      for (let x = 0; x < width; x += 2) {
        if (rn(bandSeed + x * 0.013) > 0.43) {
          const gray = Math.floor(rn(bandSeed + x * 0.031) * 120);
          context.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
          context.fillRect(x, y, 2, bandHeight * 0.65);
        }
      }

      context.restore();
    }
  }

  if (total > 0.2) {
    const tearCount = Math.floor((total - 0.2) * 12);

    for (let index = 0; index < tearCount; index += 1) {
      const tearSeed = seed + 200 + index * 31 + Math.floor(time * 0.7 + index);
      const y = rn(tearSeed) * height * 0.78 + height * 0.05;
      const tearHeight = 1 + rn(tearSeed + 0.1) * 5;
      const shift = (rn(tearSeed + 0.2) - 0.5) * lerp(12, 45, total);

      context.save();
      context.globalAlpha = lerp(0.42, 0.92, total);
      context.drawImage(
        context.canvas,
        0,
        y * pixelRatio,
        width * pixelRatio,
        tearHeight * pixelRatio,
        shift,
        y,
        width,
        tearHeight,
      );
      context.restore();
    }
  }

  if (total > 0.42) {
    const blockCount = Math.floor((total - 0.42) * 14);

    for (let index = 0; index < blockCount; index += 1) {
      const blockSeed =
        seed + 400 + index * 41 + Math.floor(time * 0.3 + index * 0.35);

      context.save();
      context.globalAlpha = lerp(0.62, 1, rn(blockSeed + 0.5));
      context.fillStyle =
        GLITCH_COLORS[Math.floor(rn(blockSeed + 0.6) * GLITCH_COLORS.length)];
      context.fillRect(
        rn(blockSeed + 0.1) * width * 0.8,
        rn(blockSeed + 0.2) * height * 0.65,
        lerp(4, 55, rn(blockSeed + 0.3)),
        lerp(2, 65, rn(blockSeed + 0.4)),
      );
      context.restore();
    }

    const streakCount = Math.floor((total - 0.42) * 9);

    for (let index = 0; index < streakCount; index += 1) {
      const streakSeed = seed + 500 + index * 17 + Math.floor(time * 0.35);

      context.save();
      context.globalAlpha = rn(streakSeed + 0.4) * 0.95;
      context.fillStyle =
        GLITCH_COLORS[Math.floor(rn(streakSeed + 0.5) * GLITCH_COLORS.length)];
      context.fillRect(
        0,
        rn(streakSeed + 0.1) * height * 0.7,
        rn(streakSeed + 0.2) * width * 0.92,
        1 + rn(streakSeed + 0.3) * 4,
      );
      context.restore();
    }
  }

  if (total > 0.58) {
    updateCheckerboardState(checkerboardState, frame, width, height, damage);

    const cellSize = 4 + Math.floor((total - 0.58) * 10);
    const blockWidth = lerp(20, 90, (total - 0.58) * 2.4);
    const blockHeight = lerp(8, 35, (total - 0.58) * 2.4);

    context.save();
    context.globalAlpha = lerp(0.58, 1, (total - 0.58) * 2.4);

    for (
      let x = checkerboardState.x;
      x < checkerboardState.x + blockWidth;
      x += cellSize
    ) {
      for (
        let y = checkerboardState.y;
        y < checkerboardState.y + blockHeight;
        y += cellSize
      ) {
        const isLight =
          (Math.floor((x - checkerboardState.x) / cellSize) +
            Math.floor((y - checkerboardState.y) / cellSize)) %
            2 ===
          0;
        context.fillStyle = isLight ? "#fff" : "#000";
        context.fillRect(x, y, cellSize, cellSize);
      }
    }

    context.restore();

    if (damage > 0.8) {
      const xStart = width - checkerboardState.x - blockWidth * 0.6;
      const yStart = height * 0.72 - checkerboardState.y;

      context.save();
      context.globalAlpha = lerp(0.42, 0.82, (damage - 0.8) * 5);

      for (let x = xStart; x < xStart + blockWidth * 0.6; x += cellSize) {
        for (let y = yStart; y < yStart + blockHeight * 0.6; y += cellSize) {
          const isLight =
            (Math.floor((x - xStart) / cellSize) +
              Math.floor((y - yStart) / cellSize)) %
              2 ===
            0;
          context.fillStyle = isLight ? "#fff" : "#000";
          context.fillRect(x, y, cellSize, cellSize);
        }
      }

      context.restore();
    }
  }

  if (hit > 0.05) {
    const hitCount = Math.floor(hit * 14);

    for (let index = 0; index < hitCount; index += 1) {
      const hitSeed = seed + index * 11;

      context.save();
      context.globalAlpha = hit * (rn(hitSeed + 0.5) * 0.5 + 0.3);
      context.fillStyle =
        GLITCH_COLORS[Math.floor(rn(hitSeed + 0.6) * GLITCH_COLORS.length)];
      context.fillRect(
        (rn(hitSeed + 0.4) - 0.5) * hit * 30,
        rn(hitSeed + 0.1) * height * 0.85,
        rn(hitSeed + 0.2) * width,
        1 + rn(hitSeed + 0.3) * 7,
      );
      context.restore();
    }

    context.save();
    context.globalAlpha = hit * 0.18;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  const rgbOffset = lerp(0, 9, total) + hit * 16;

  if (rgbOffset > 0.4) {
    context.save();
    context.globalCompositeOperation = "screen";
    context.globalAlpha = lerp(0.04, 0.34, total) + hit * 0.24;
    context.fillStyle = "rgba(255, 0, 0, 0.1)";
    context.fillRect(rgbOffset, 0, width, height);
    context.fillStyle = "rgba(0, 40, 255, 0.09)";
    context.fillRect(-rgbOffset, 0, width, height);
    context.restore();
  }

  drawVignette(context, width, height);
}

export default function CardCrtGlitchOverlay({
  impact,
  isTerminal = false,
  resetToken = 0,
  side,
}: CardCrtGlitchOverlayProps) {
  const [drawToken, setDrawToken] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hpRef = useRef(100);
  const pulseRef = useRef(0);
  const seedRef = useRef(side === "right" ? 91 : 3);
  const frameRef = useRef(0);
  const lastImpactKeyRef = useRef<string | null>(null);
  const checkerboardStateRef = useRef<CheckerboardState>({
    nextFlip: 0,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (!impact) {
      pulseRef.current = 0;
      return;
    }

    const nextHp = clampHp(impact.hp);
    hpRef.current = isTerminal ? 0 : Math.min(hpRef.current, nextHp);

    const impactKey = `${impact.runId}-${impact.act}-${impact.hp}`;
    if (lastImpactKeyRef.current === impactKey) return;

    lastImpactKeyRef.current = impactKey;
    seedRef.current =
      (side === "right" ? 91 : 3) + impact.runId * 0.001 + impact.act * 37;
    pulseRef.current = 1;
    setDrawToken((current) => current + 1);
  }, [impact, isTerminal, side]);

  useEffect(() => {
    hpRef.current = isTerminal ? 0 : 100;
    pulseRef.current = 0;
    seedRef.current = side === "right" ? 91 : 3;
    lastImpactKeyRef.current = null;
    checkerboardStateRef.current = {
      nextFlip: 0,
      x: 0,
      y: 0,
    };

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    setDrawToken((current) => current + 1);
  }, [isTerminal, resetToken, side]);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const renderingContext = canvasElement.getContext("2d");
    if (!renderingContext) return;

    const canvas: HTMLCanvasElement = canvasElement;
    const context: CanvasRenderingContext2D = renderingContext;

    let animationFrame = 0;
    let lastWidth = 0;
    let lastHeight = 0;
    let lastRatio = 0;

    function hasActiveGlitch() {
      return isTerminal || hpRef.current < 99.5 || pulseRef.current > 0.01;
    }

    function draw() {
      frameRef.current += 1;
      pulseRef.current = Math.max(0, pulseRef.current - 0.042);

      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      if (width !== lastWidth || height !== lastHeight || ratio !== lastRatio) {
        lastWidth = width;
        lastHeight = height;
        lastRatio = ratio;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawCardCrtGlitch(
        context,
        width,
        height,
        hpRef.current,
        pulseRef.current,
        seedRef.current,
        frameRef.current,
        checkerboardStateRef.current,
        side === "right",
        ratio,
      );

      if (hasActiveGlitch()) {
        animationFrame = window.requestAnimationFrame(draw);
      } else {
        animationFrame = 0;
      }
    }

    draw();

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [drawToken, isTerminal, side]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="home-battle-card-crt-glitch"
    />
  );
}
