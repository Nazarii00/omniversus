"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import type { ArenaCard } from "../types";
import CardDockSlot from "./CardDockSlot";
import HologramCombatantCard from "./HologramCombatantCard";

type CombatantEntrySlotProps = {
  card: ArenaCard | null;
  template: ArenaCard;
  label: string;
  onCommitName: (name: string) => void;
};

export default function CombatantEntrySlot({
  card,
  template,
  label,
  onCommitName,
}: CombatantEntrySlotProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(card?.name ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const themeStyle = {
    "--entry-accent": template.theme.accent,
    "--entry-accent-soft": template.theme.accentSoft,
    "--entry-accent-glow": template.theme.accentGlow,
    "--entry-accent-text": template.theme.accentText,
  } as CSSProperties;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function commitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = draftName.trim();

    if (!nextName) {
      return;
    }

    onCommitName(nextName);
    setIsEditing(false);
  }

  return (
    <div className="relative w-[min(84vw,18.5rem)] sm:w-[18.75rem] md:w-[19.5rem]">
      <CardDockSlot side={template.side} theme={template.theme} />

      {card ? <HologramCombatantCard card={card} /> : null}

      {!card && !isEditing ? (
        <button
          type="button"
          className="home-combatant-entry-slot"
          onClick={() => setIsEditing(true)}
          style={themeStyle}
        >
          <span className="home-combatant-entry-slot__label">{label}</span>
          <span className="home-combatant-entry-slot__prompt">
            &gt; CLICK_SLOT_TO_INPUT_NAME
          </span>
        </button>
      ) : null}

      {!card && isEditing ? (
        <form
          className="home-combatant-entry-slot home-combatant-entry-slot__form"
          onSubmit={commitName}
          style={themeStyle}
        >
          <span className="home-combatant-entry-slot__label">{label}</span>
          <label htmlFor={`combatant-${template.side}`}>ENTER_COMBATANT_NAME</label>
          <input
            ref={inputRef}
            id={`combatant-${template.side}`}
            value={draftName}
            placeholder={template.side === "left" ? "Goku" : "Superman"}
            onChange={(event) => setDraftName(event.target.value)}
          />
          <span>PRESS_ENTER_TO_LOAD_CARD</span>
        </form>
      ) : null}
    </div>
  );
}
