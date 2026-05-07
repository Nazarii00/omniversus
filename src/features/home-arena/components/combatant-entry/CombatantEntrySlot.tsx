"use client";

import type { CSSProperties } from "react";

import type { ArenaCard } from "../../model";
import { CardDockSlot, HologramCombatantCard } from "../combatant-card";

type CombatantEntrySlotProps = {
  card: ArenaCard | null;
  template: ArenaCard;
  label: string;
  onOpenConsole: () => void;
};

export default function CombatantEntrySlot({
  card,
  template,
  label,
  onOpenConsole,
}: CombatantEntrySlotProps) {
  const themeStyle = {
    "--entry-accent": template.theme.accent,
    "--entry-accent-soft": template.theme.accentSoft,
    "--entry-accent-glow": template.theme.accentGlow,
    "--entry-accent-text": template.theme.accentText,
  } as CSSProperties;

  return (
    <div
      className="home-combatant-entry relative w-[min(84vw,18.5rem)] sm:w-[18.75rem] md:w-[19.5rem]"
      data-state={card ? "loaded" : "empty"}
      style={themeStyle}
    >
      <CardDockSlot side={template.side} theme={template.theme} />

      {card ? <HologramCombatantCard card={card} /> : null}

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
