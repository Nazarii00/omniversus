"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import type { ArenaCard } from "../../model";

export type BattleRevealRole = "winner" | "loser";

export type BattleRevealConfig = {
  runId: number;
  role: BattleRevealRole;
  actCount: number;
};

export type BattleRevealPhase =
  | "idle"
  | "acts"
  | "brutal"
  | "destruction"
  | "verdict";

type CanvasTarget = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
};

type FragmentChunk = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationVelocity: number;
  glitch: boolean;
  color: string;
};

const ACT_SPACING_MS = 900;
const BRUTAL_FLASH_MS = 720;
const DESTRUCTION_DELAY_MS = 400;
const DESTRUCTION_MS = 1320;
const MAX_HEAVY_ACT = 3;

const glitchPalette = [
  "rgba(255, 36, 68, 0.92)",
  "rgba(0, 255, 255, 0.82)",
  "rgba(255, 230, 77, 0.86)",
  "rgba(255, 42, 212, 0.78)",
  "rgba(104, 183, 104, 0.86)",
  "rgba(255, 255, 255, 0.9)",
];

export function useBattleRevealAnimation(
  card: ArenaCard,
  reveal: BattleRevealConfig | null | undefined,
) {
  const damageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const flashCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const frameRefs = useRef<number[]>([]);
  const [phaseState, setPhaseState] = useState<{
    runId: number;
    phase: BattleRevealPhase;
  } | null>(null);
  const [destroyedRunId, setDestroyedRunId] = useState<number | null>(null);
  const revealActCount = reveal?.actCount;
  const revealRole = reveal?.role;
  const revealRunId = reveal?.runId;
  const hasActiveReveal = Boolean(revealRole && revealRunId !== undefined);
  const phase =
    hasActiveReveal && revealRunId !== undefined
      ? phaseState?.runId === revealRunId
        ? phaseState.phase
        : "acts"
      : "idle";
  const isDestroyed =
    hasActiveReveal &&
    revealRunId !== undefined &&
    destroyedRunId === revealRunId;

  useEffect(() => {
    function clearTimeline() {
      for (const timeoutId of timeoutRefs.current) {
        window.clearTimeout(timeoutId);
      }

      for (const frameId of frameRefs.current) {
        window.cancelAnimationFrame(frameId);
      }

      timeoutRefs.current = [];
      frameRefs.current = [];
    }

    function queueTimeout(callback: () => void, delayMs: number) {
      const timeoutId = window.setTimeout(() => {
        timeoutRefs.current = timeoutRefs.current.filter(
          (id) => id !== timeoutId,
        );
        callback();
      }, delayMs);

      timeoutRefs.current.push(timeoutId);
    }

    function queueFrame(callback: FrameRequestCallback) {
      const frameId = window.requestAnimationFrame((time) => {
        frameRefs.current = frameRefs.current.filter((id) => id !== frameId);
        callback(time);
      });

      frameRefs.current.push(frameId);
    }

    clearTimeline();
    clearCanvas(damageCanvasRef.current);
    clearCanvas(flashCanvasRef.current);

    if (!revealRole || revealRunId === undefined) {
      return clearTimeline;
    }

    const currentRunId = revealRunId;
    const actCount = Math.max(1, Math.round(revealActCount || 1));
    const finalRevealDelay =
      actCount * ACT_SPACING_MS +
      BRUTAL_FLASH_MS +
      DESTRUCTION_DELAY_MS +
      DESTRUCTION_MS;
    let active = true;

    for (let act = 1; act <= actCount; act += 1) {
      queueTimeout(
        () => {
          if (!active) return;

          if (revealRole === "loser") {
            drawPersistentActDamage(damageCanvasRef.current, act);
            drawActFlash(flashCanvasRef.current, act);
            queueTimeout(() => clearCanvas(flashCanvasRef.current), 240);
            return;
          }

          if (act <= 2) {
            drawWinnerCosmeticGlitch(flashCanvasRef.current, act);
            queueTimeout(() => clearCanvas(flashCanvasRef.current), 260);
          }
        },
        (act - 1) * ACT_SPACING_MS,
      );
    }

    if (revealRole === "winner") {
      queueTimeout(() => {
        if (!active) return;

        clearCanvas(damageCanvasRef.current);
        clearCanvas(flashCanvasRef.current);
        setPhaseState({ runId: currentRunId, phase: "verdict" });
      }, finalRevealDelay);

      return () => {
        active = false;
        clearTimeline();
      };
    }

    queueTimeout(() => {
      if (!active) return;

      setPhaseState({ runId: currentRunId, phase: "brutal" });
      playBrutalFlash(flashCanvasRef.current, queueFrame);
    }, actCount * ACT_SPACING_MS);

    queueTimeout(
      () => {
        if (!active) return;

        setPhaseState({ runId: currentRunId, phase: "destruction" });
        playDestruction(card, flashCanvasRef.current, queueFrame, () => {
          if (!active) return;

          clearCanvas(flashCanvasRef.current);
          setDestroyedRunId(currentRunId);
          setPhaseState({ runId: currentRunId, phase: "verdict" });
        });
      },
      actCount * ACT_SPACING_MS + BRUTAL_FLASH_MS + DESTRUCTION_DELAY_MS,
    );

    return () => {
      active = false;
      clearTimeline();
    };
  }, [card, revealActCount, revealRole, revealRunId]);

  return {
    damageCanvasRef,
    flashCanvasRef,
    isDestroyed,
    phase,
    role: revealRole ?? null,
  };
}

type BattleRevealCanvasesProps = {
  damageCanvasRef: RefObject<HTMLCanvasElement | null>;
  flashCanvasRef: RefObject<HTMLCanvasElement | null>;
};

export function BattleRevealCanvases({
  damageCanvasRef,
  flashCanvasRef,
}: BattleRevealCanvasesProps) {
  return (
    <>
      <canvas
        ref={damageCanvasRef}
        className="home-battle-reveal-canvas home-battle-reveal-canvas--damage"
        aria-hidden="true"
      />
      <canvas
        ref={flashCanvasRef}
        className="home-battle-reveal-canvas home-battle-reveal-canvas--flash"
        aria-hidden="true"
      />
    </>
  );
}

function configureCanvas(
  canvas: HTMLCanvasElement | null,
): CanvasTarget | null {
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const backingWidth = Math.round(width * dpr);
  const backingHeight = Math.round(height * dpr);

  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  return { canvas, ctx, width, height };
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
  const target = configureCanvas(canvas);
  if (!target) return;

  target.ctx.clearRect(0, 0, target.width, target.height);
}

function drawPersistentActDamage(
  canvas: HTMLCanvasElement | null,
  act: number,
) {
  const target = configureCanvas(canvas);
  if (!target) return;

  const { ctx, width, height } = target;
  const intensity = Math.min(1, act / MAX_HEAVY_ACT);
  const blockCount = Math.round(18 + intensity * 54);
  const tearCount = Math.round(5 + intensity * 12);
  const stripCount = Math.round(5 + intensity * 14);
  const invertCount = Math.round(2 + intensity * 8);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  for (let index = 0; index < blockCount; index += 1) {
    const blockSize = randomInt(4, 8);
    const blockWidth = blockSize * randomInt(1, intensity > 0.72 ? 5 : 3);
    const blockHeight = blockSize * randomInt(1, intensity > 0.72 ? 4 : 2);
    ctx.fillStyle = randomFrom(glitchPalette);
    ctx.globalAlpha = randomBetween(0.36, 0.72);
    ctx.fillRect(
      randomBetween(0, width - blockWidth),
      randomBetween(0, height - blockHeight),
      blockWidth,
      blockHeight,
    );
  }

  ctx.globalAlpha = 1;
  for (let index = 0; index < tearCount; index += 1) {
    const y = randomBetween(0, height);
    const tearHeight = randomBetween(1, 3 + intensity * 5);
    const x = randomBetween(-width * 0.08, width * 0.22);
    const tearWidth = randomBetween(width * 0.42, width * 1.08);
    ctx.fillStyle = `rgba(255, 255, 255, ${randomBetween(0.08, 0.18 + intensity * 0.18)})`;
    ctx.fillRect(x, y, tearWidth, tearHeight);
    ctx.fillStyle = `rgba(0, 0, 0, ${randomBetween(0.14, 0.38)})`;
    ctx.fillRect(
      x + randomBetween(-10, 12),
      y + tearHeight + randomBetween(1, 4),
      tearWidth * randomBetween(0.32, 0.86),
      randomBetween(1, 3),
    );
  }

  for (let index = 0; index < stripCount; index += 1) {
    drawRgbShiftStrip(ctx, width, height, intensity);
  }

  ctx.globalCompositeOperation = "difference";
  for (let index = 0; index < invertCount; index += 1) {
    const patchWidth = randomBetween(
      width * 0.08,
      width * (0.16 + intensity * 0.1),
    );
    const patchHeight = randomBetween(
      height * 0.025,
      height * (0.08 + intensity * 0.08),
    );
    ctx.globalAlpha = randomBetween(0.42, 0.88);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
      randomBetween(0, width - patchWidth),
      randomBetween(0, height - patchHeight),
      patchWidth,
      patchHeight,
    );
  }

  ctx.restore();
}

function drawActFlash(canvas: HTMLCanvasElement | null, act: number) {
  const target = configureCanvas(canvas);
  if (!target) return;

  const { ctx, width, height } = target;
  const intensity = Math.min(1, act / MAX_HEAVY_ACT);

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (let index = 0; index < 8 + intensity * 18; index += 1) {
    ctx.fillStyle = randomFrom(glitchPalette);
    ctx.globalAlpha = randomBetween(0.22, 0.66);
    ctx.fillRect(
      randomBetween(-8, width),
      randomBetween(0, height),
      randomBetween(width * 0.08, width * (0.26 + intensity * 0.2)),
      randomBetween(3, 8 + intensity * 18),
    );
  }

  for (let index = 0; index < 4 + intensity * 8; index += 1) {
    drawRgbShiftStrip(ctx, width, height, intensity);
  }

  ctx.restore();
}

function drawWinnerCosmeticGlitch(
  canvas: HTMLCanvasElement | null,
  act: number,
) {
  const target = configureCanvas(canvas);
  if (!target) return;

  const { ctx, width, height } = target;
  const intensity = act === 1 ? 0.2 : 0.34;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (let index = 0; index < 7; index += 1) {
    drawRgbShiftStrip(ctx, width, height, intensity);
  }

  for (let index = 0; index < 10; index += 1) {
    const size = randomInt(4, 8);
    ctx.fillStyle = randomFrom(glitchPalette);
    ctx.globalAlpha = randomBetween(0.16, 0.34);
    ctx.fillRect(
      randomBetween(0, width - size),
      randomBetween(0, height - size),
      size * randomInt(1, 3),
      size,
    );
  }

  ctx.restore();
}

function playBrutalFlash(
  canvas: HTMLCanvasElement | null,
  queueFrame: (callback: FrameRequestCallback) => void,
) {
  const startedAt = performance.now();
  const frameCount = randomInt(15, 20);
  let lastFrame = -1;

  function tick(now: number) {
    const progress = Math.min(1, (now - startedAt) / BRUTAL_FLASH_MS);
    const frame = Math.min(frameCount - 1, Math.floor(progress * frameCount));

    if (frame !== lastFrame) {
      drawBrutalFrame(canvas, progress);
      lastFrame = frame;
    }

    if (progress < 1) {
      queueFrame(tick);
      return;
    }

    clearCanvas(canvas);
  }

  queueFrame(tick);
}

function drawBrutalFrame(canvas: HTMLCanvasElement | null, progress: number) {
  const target = configureCanvas(canvas);
  if (!target) return;

  const { ctx, width, height } = target;
  const intensity = 0.78 + progress * 0.22;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (let index = 0; index < 26; index += 1) {
    ctx.fillStyle = randomFrom(glitchPalette);
    ctx.globalAlpha = randomBetween(0.42, 0.92);
    ctx.fillRect(
      randomBetween(-width * 0.08, width * 0.92),
      randomBetween(0, height),
      randomBetween(width * 0.12, width * 0.58),
      randomBetween(5, height * 0.16),
    );
  }

  for (let index = 0; index < 18; index += 1) {
    drawRgbShiftStrip(ctx, width, height, intensity);
  }

  ctx.globalCompositeOperation = "difference";
  for (let index = 0; index < 9; index += 1) {
    ctx.globalAlpha = randomBetween(0.64, 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
      randomBetween(0, width * 0.88),
      randomBetween(0, height * 0.9),
      randomBetween(width * 0.12, width * 0.42),
      randomBetween(height * 0.06, height * 0.24),
    );
  }

  ctx.restore();
}

function playDestruction(
  card: ArenaCard,
  canvas: HTMLCanvasElement | null,
  queueFrame: (callback: FrameRequestCallback) => void,
  onComplete: () => void,
) {
  const target = configureCanvas(canvas);
  if (!target) {
    onComplete();
    return;
  }

  const texture = createCardTexture(card, target.width, target.height);
  const chunks = createFragmentChunks(target.width, target.height);
  const startedAt = performance.now();

  function tick(now: number) {
    const nextTarget = configureCanvas(canvas);
    if (!nextTarget) {
      onComplete();
      return;
    }

    const { ctx, width, height } = nextTarget;
    const progress = Math.min(1, (now - startedAt) / DESTRUCTION_MS);
    const elapsedSeconds = (now - startedAt) / 1000;

    ctx.clearRect(0, 0, width, height);
    drawDestructionRgbSplit(ctx, texture, width, height, progress);
    drawFragmentChunks(ctx, texture, chunks, elapsedSeconds, progress);

    if (progress < 1) {
      queueFrame(tick);
      return;
    }

    onComplete();
  }

  queueFrame(tick);
}

function drawDestructionRgbSplit(
  ctx: CanvasRenderingContext2D,
  texture: HTMLCanvasElement,
  width: number,
  height: number,
  progress: number,
) {
  const split = 5 + progress * 18;
  const alpha = Math.max(0, 0.46 - progress * 0.26);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = alpha;
  ctx.drawImage(texture, split, 0, width, height);
  ctx.globalAlpha = alpha * 0.85;
  ctx.drawImage(texture, -split, 0, width, height);
  ctx.restore();
}

function drawFragmentChunks(
  ctx: CanvasRenderingContext2D,
  texture: HTMLCanvasElement,
  chunks: FragmentChunk[],
  elapsedSeconds: number,
  progress: number,
) {
  const gravity = 210 * progress * progress;
  const alpha = Math.max(0, 1 - Math.pow(progress, 1.45));

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  for (const chunk of chunks) {
    const x = chunk.x + chunk.vx * elapsedSeconds;
    const y = chunk.y + chunk.vy * elapsedSeconds + gravity;
    const rotation = chunk.rotation + chunk.rotationVelocity * elapsedSeconds;

    ctx.save();
    ctx.globalAlpha = alpha * randomBetween(0.72, 1);
    ctx.translate(x + chunk.sw / 2, y + chunk.sh / 2);
    ctx.rotate(rotation);

    if (chunk.glitch) {
      ctx.fillStyle = chunk.color;
      ctx.fillRect(-chunk.sw / 2, -chunk.sh / 2, chunk.sw, chunk.sh);
      ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
      ctx.fillRect(-chunk.sw / 2, -chunk.sh / 2, chunk.sw, 2);
    } else {
      ctx.drawImage(
        texture,
        chunk.sx,
        chunk.sy,
        chunk.sw,
        chunk.sh,
        -chunk.sw / 2,
        -chunk.sh / 2,
        chunk.sw,
        chunk.sh,
      );
    }

    ctx.restore();
  }

  ctx.restore();
}

function createFragmentChunks(width: number, height: number): FragmentChunk[] {
  const cols = randomInt(12, 16);
  const rows = randomInt(16, 20);
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const chunks: FragmentChunk[] = [];
  const centerX = width / 2;
  const centerY = height / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const sx = Math.round(col * cellWidth);
      const sy = Math.round(row * cellHeight);
      const sw = Math.ceil(cellWidth);
      const sh = Math.ceil(cellHeight);
      const x = sx;
      const y = sy;
      const dx = x + sw / 2 - centerX;
      const dy = y + sh / 2 - centerY;
      const angle = Math.atan2(dy, dx);
      const speed = randomBetween(92, 270);
      const outward = randomBetween(0.72, 1.36);

      chunks.push({
        sx,
        sy,
        sw,
        sh,
        x,
        y,
        vx: Math.cos(angle) * speed * outward + randomBetween(-140, 140),
        vy:
          Math.sin(angle) * speed * outward +
          randomBetween(-290, 70) -
          row * randomBetween(2, 7),
        rotation: randomBetween(-0.42, 0.42),
        rotationVelocity: randomBetween(-7.8, 7.8),
        glitch: Math.random() < 0.24,
        color: randomFrom(glitchPalette),
      });
    }
  }

  return chunks;
}

function createCardTexture(card: ArenaCard, width: number, height: number) {
  const texture = document.createElement("canvas");
  texture.width = width;
  texture.height = height;
  const ctx = texture.getContext("2d");

  if (!ctx) return texture;

  ctx.imageSmoothingEnabled = false;

  const accent = card.theme.accent;
  const accentText = card.theme.accentText;
  const secondary = card.theme.secondary;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#06100d");
  gradient.addColorStop(0.44, "#020403");
  gradient.addColorStop(1, "#071812");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(2, width * 0.008);
  ctx.strokeRect(4, 4, width - 8, height - 8);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(width * 0.06, height * 0.06, width * 0.88, height * 0.88);

  ctx.fillStyle = "rgba(255,255,255,0.045)";
  for (let y = 0; y < height; y += 7) {
    ctx.fillRect(0, y, width, 1);
  }

  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.fillRect(width * 0.14, height * 0.18, width * 0.72, height * 0.34);
  ctx.strokeStyle = accent;
  ctx.strokeRect(width * 0.14, height * 0.18, width * 0.72, height * 0.34);

  ctx.fillStyle = `${accent}55`;
  for (let index = 0; index < 7; index += 1) {
    const y = height * 0.22 + index * height * 0.04;
    ctx.fillRect(width * 0.22, y, width * 0.56, 2);
  }

  ctx.fillStyle = accentText;
  ctx.font = `${Math.max(10, width * 0.045)}px "Cascadia Mono", monospace`;
  ctx.fillText(card.serial, width * 0.12, height * 0.12);
  ctx.textAlign = "right";
  ctx.fillText(card.powerIndex, width * 0.88, height * 0.12);

  ctx.textAlign = "left";
  ctx.fillStyle = secondary;
  ctx.font = `${Math.max(10, width * 0.042)}px "Cascadia Mono", monospace`;
  ctx.fillText(
    card.universe.toUpperCase().slice(0, 28),
    width * 0.12,
    height * 0.64,
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${Math.max(16, width * 0.075)}px "Cascadia Mono", monospace`;
  wrapTextureText(
    ctx,
    card.name.toUpperCase(),
    width * 0.12,
    height * 0.73,
    width * 0.76,
    height * 0.082,
  );

  ctx.fillStyle = accentText;
  ctx.font = `${Math.max(10, width * 0.043)}px "Cascadia Mono", monospace`;
  wrapTextureText(
    ctx,
    card.stance,
    width * 0.12,
    height * 0.86,
    width * 0.76,
    height * 0.06,
  );

  return texture;
}

function wrapTextureText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let currentY = y;

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(nextLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
      continue;
    }

    line = nextLine;
  }

  if (line) {
    ctx.fillText(line, x, currentY);
  }
}

function drawRgbShiftStrip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
) {
  const y = randomBetween(0, height);
  const stripHeight = randomBetween(2, 5 + intensity * 15);
  const shift = randomBetween(4, 10 + intensity * 24);
  const stripWidth = randomBetween(
    width * 0.28,
    width * (0.78 + intensity * 0.3),
  );
  const x = randomBetween(-width * 0.12, width * 0.42);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = randomBetween(0.28, 0.72);
  ctx.fillStyle = "rgba(255, 0, 56, 0.86)";
  ctx.fillRect(x + shift, y, stripWidth, stripHeight);
  ctx.fillStyle = "rgba(0, 255, 255, 0.72)";
  ctx.fillRect(x - shift, y + randomBetween(-2, 2), stripWidth, stripHeight);
  ctx.restore();
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

function randomFrom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}
