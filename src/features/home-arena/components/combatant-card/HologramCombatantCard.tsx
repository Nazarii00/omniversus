"use client";

import { useState, type KeyboardEvent } from "react";
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
      style={themeStyle}
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
              isEliminated={isEliminated}
            />
            <HologramCombatantBackFace
              card={card}
              crtImpact={crtImpact}
              crtResetToken={crtResetToken}
              isEliminated={isEliminated}
            />
          </div>
        </div>
      </div>
      {isEliminated ? (
        <span className="home-battle-elimination-layer" aria-hidden="true">
          <EliminationStampOverlay />
        </span>
      ) : null}
    </button>
  );
}
