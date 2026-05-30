"use client";

import { memo } from "react";
import type { ArenaCard, CardCrtGlitchImpact } from "../../model";
import { entryThemeStyle } from "../../logic";
import { CardDockSlot } from "../combatant-card/chrome";
import { HologramCombatantCard } from "../combatant-card";

type CombatantEntrySlotProps = {
  card: ArenaCard | null;
  crtImpact?: CardCrtGlitchImpact | null;
  crtResetToken?: number;
  isEliminated?: boolean;
  template: ArenaCard;
  label: string;
  onOpenConsole: () => void;
};

function CombatantEntrySlot({
  card,
  crtImpact = null,
  crtResetToken = 0,
  isEliminated = false,
  template,
  label,
  onOpenConsole,
}: CombatantEntrySlotProps) {
  const themeStyle = entryThemeStyle(template.theme);

  return (
    <div
      className="home-combatant-entry relative w-[min(84vw,18.5rem)] sm:w-[18.75rem] md:w-[19.5rem]"
      data-state={card ? "loaded" : "empty"}
      style={themeStyle}
    >
      <CardDockSlot side={template.side} theme={template.theme} />

      {card ? (
        <HologramCombatantCard
          card={card}
          crtImpact={crtImpact}
          crtResetToken={crtResetToken}
          isEliminated={isEliminated}
        />
      ) : null}

      {!card ? (
        <button
          type="button"
          aria-label={`Input combatant for ${label}`}
          className="home-combatant-entry-hitbox"
          onClick={onOpenConsole}
        />
      ) : null}
    </div>
  );
}

export default memo(CombatantEntrySlot);
