"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { cardThemeStyle } from "../../logic";
import type { ArenaCard, CardCrtGlitchImpact } from "../../model";
import { CardDepthChrome } from "./chrome";
import { EliminationStampOverlay, useCrtJolt } from "./effects";
import { HologramCombatantBackFace, HologramCombatantFrontFace } from "./face";

type HologramCombatantCardProps = {
  card: ArenaCard;
  crtImpact?: CardCrtGlitchImpact | null;
  crtResetToken?: number;
  className?: string;
  disableLevitation?: boolean;
  isEliminated?: boolean;
  onActivate?: () => void;
  activateLabel?: string;
};

function blockSpaceAndShift(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key === " " || event.code === "Space" || event.key === "Shift") {
    event.preventDefault();
    event.stopPropagation();
  }
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function impactDamage(crtImpact: CardCrtGlitchImpact | null) {
  if (!crtImpact) return 0;

  return clamp((100 - crtImpact.hp) / 100);
}

function battleDamageLevel(damage: number) {
  if (damage >= 0.82) return "critical";
  if (damage >= 0.58) return "fractured";
  if (damage >= 0.28) return "unstable";
  if (damage > 0.02) return "scuffed";

  return undefined;
}

function battleCardGlitchStyle(
  themeStyle: ReturnType<typeof cardThemeStyle>,
  crtImpact: CardCrtGlitchImpact | null,
) {
  const damage = impactDamage(crtImpact);
  const hit = crtImpact ? 1 : 0;
  const active = clamp(damage + hit * 0.55);

  return {
    ...themeStyle,
    "--battle-card-damage": damage.toFixed(3),
    "--battle-card-damage-edge-opacity": clamp(damage * 0.82).toFixed(3),
    "--battle-card-damage-opacity": clamp(damage * 0.82).toFixed(3),
    "--battle-card-glitch": active.toFixed(3),
    "--battle-card-hit-brightness": (1.08 + active * 0.28).toFixed(3),
    "--battle-card-hit-contrast": (1.1 + active * 0.32).toFixed(3),
    "--battle-card-hit-opacity": clamp(active * 0.9).toFixed(3),
    "--battle-card-hit-saturation": (1.08 + active * 0.62).toFixed(3),
    "--battle-card-hp": String(crtImpact?.hp ?? 100),
    "--battle-card-scan-opacity": clamp(damage * 0.46 + hit * 0.16).toFixed(3),
    "--battle-card-slice-opacity": clamp(active * 0.88).toFixed(3),
    "--battle-card-tv-bars-opacity": clamp(damage * 0.54 + hit * 0.22).toFixed(
      3,
    ),
    "--battle-card-tv-blackout-opacity": clamp(
      damage * 0.74 + hit * 0.16,
    ).toFixed(3),
    "--battle-card-tv-dropout-opacity": clamp(
      damage * 0.74 + hit * 0.22,
    ).toFixed(3),
    "--battle-card-tv-noise-opacity": clamp(damage * 0.84 + hit * 0.18).toFixed(
      3,
    ),
    "--battle-card-tv-pulse-opacity": clamp(active * 0.9).toFixed(3),
    "--battle-card-tv-sync-opacity": clamp(damage * 0.58 + hit * 0.34).toFixed(
      3,
    ),
    "--battle-card-tv-texture-opacity": clamp(
      damage * 0.7 + hit * 0.18,
    ).toFixed(3),
  } as CSSProperties;
}

export default function HologramCombatantCard({
  card,
  crtImpact = null,
  crtResetToken = 0,
  className = "",
  disableLevitation = false,
  isEliminated = false,
  onActivate,
  activateLabel,
}: HologramCombatantCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const crtImpactKey = crtImpact
    ? `${crtImpact.runId}-${crtImpact.act}-${crtImpact.hp}`
    : null;
  const joltShellRef = useCrtJolt(crtImpactKey);
  const levitationClass =
    card.side === "left"
      ? "home-card-levitate-left"
      : "home-card-levitate-right";
  const motionClass = disableLevitation ? "" : levitationClass;
  const themeStyle = cardThemeStyle(card.theme);
  const damage = impactDamage(crtImpact);
  const damageLevel = battleDamageLevel(damage);
  const battleStyle = battleCardGlitchStyle(themeStyle, crtImpact);

  function activateCard() {
    if (onActivate) {
      onActivate();
      return;
    }

    setIsFlipped((current) => !current);
  }

  return (
    <button
      type="button"
      aria-label={activateLabel ?? `${card.name} dossier`}
      aria-pressed={onActivate ? undefined : isFlipped}
      onClick={activateCard}
      onKeyDown={blockSpaceAndShift}
      onKeyUp={blockSpaceAndShift}
      className={`home-battle-card group relative block aspect-[5/7] w-full min-w-0 cursor-pointer text-left outline-none [perspective:1500px] ${className}`}
      data-battle-damage={damageLevel}
      style={battleStyle}
    >
      <div
        ref={joltShellRef}
        className="home-battle-card-jolt-shell absolute inset-0 [transform-style:preserve-3d]"
        data-eliminated={isEliminated ? "true" : undefined}
      >
        <div
          className={`${motionClass} absolute inset-0 [transform-style:preserve-3d]`}
        >
          <div
            className="relative h-full w-full transition-transform duration-700 ease-out [transform-style:preserve-3d]"
            style={{
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            <CardDepthChrome />

            <HologramCombatantFrontFace
              card={card}
              crtImpact={crtImpact}
              crtResetToken={crtResetToken}
            />
            <HologramCombatantBackFace
              card={card}
              crtImpact={crtImpact}
              crtResetToken={crtResetToken}
            />
          </div>

          {isEliminated ? <EliminationStampOverlay /> : null}
        </div>
      </div>
    </button>
  );
}
