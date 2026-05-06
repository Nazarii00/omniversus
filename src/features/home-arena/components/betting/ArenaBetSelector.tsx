"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import type { ArenaCard } from "../../types";

type ArenaBetSelectorProps = {
  leftCard: ArenaCard;
  rightCard: ArenaCard;
};

export default function ArenaBetSelector({
  leftCard,
  rightCard,
}: ArenaBetSelectorProps) {
  const [selectedId, setSelectedId] = useState(leftCard.id);
  const [betAmounts, setBetAmounts] = useState<Record<string, string>>({});
  const cards = [leftCard, rightCard];

  function handleZoneKeyDown(event: KeyboardEvent<HTMLDivElement>, id: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedId(id);
    }
  }

  return (
    <div className="w-full max-w-[49rem]">
      <p className="mb-3 text-center text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[#d7e2d6]/70">
        PLACE YOUR BET
      </p>

      <div className="grid grid-cols-[minmax(0,1fr)_1rem_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)]">
        {cards.map((card) => {
          const isSelected = selectedId === card.id;
          const columnClass =
            card.side === "left" ? "col-start-1" : "col-start-3";
          const themeStyle = {
            "--bet-accent": card.theme.accent,
            "--bet-accent-soft": card.theme.accentSoft,
            "--bet-accent-glow": card.theme.accentGlow,
            "--bet-accent-text": card.theme.accentText,
            "--bet-secondary": card.theme.secondary,
          } as CSSProperties;

          return (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              className={`${columnClass} home-bet-choice relative h-32 cursor-pointer overflow-hidden px-4 py-4 text-left outline-none transition-[border-color,box-shadow,filter,opacity] duration-150 sm:h-36 sm:px-5`}
              data-selected={isSelected}
              onClick={() => setSelectedId(card.id)}
              onKeyDown={(event) => handleZoneKeyDown(event, card.id)}
              style={themeStyle}
            >
              <span
                className="home-bet-choice__corner home-bet-choice__corner--tl"
                aria-hidden="true"
              />
              <span
                className="home-bet-choice__corner home-bet-choice__corner--tr"
                aria-hidden="true"
              />
              <span
                className="home-bet-choice__corner home-bet-choice__corner--bl"
                aria-hidden="true"
              />
              <span
                className="home-bet-choice__corner home-bet-choice__corner--br"
                aria-hidden="true"
              />

              <span className="relative z-10 flex h-full flex-col justify-between gap-3">
                <span
                  className="text-[0.58rem] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: "var(--bet-secondary)" }}
                >
                  {card.side === "left" ? "Alpha" : "Omega"}
                </span>
                <span className="text-base font-bold uppercase leading-none tracking-[0.03em] text-white sm:text-lg">
                  {card.name}
                </span>
                {isSelected ? (
                  <span className="grid gap-1.5">
                    <label
                      htmlFor={`bet-amount-${card.id}`}
                      className="text-[0.54rem] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: "var(--bet-accent-text)" }}
                    >
                      BET AMOUNT
                    </label>
                    <input
                      id={`bet-amount-${card.id}`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      value={betAmounts[card.id] ?? ""}
                      onChange={(event) =>
                        setBetAmounts((current) => ({
                          ...current,
                          [card.id]: event.target.value,
                        }))
                      }
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      className="home-bet-amount-input h-8 w-full border bg-[#010201]/88 px-2.5 text-right text-sm font-semibold text-white outline-none"
                      style={{
                        borderColor: "var(--bet-accent)",
                        boxShadow: "inset 0 0 12px rgba(0,0,0,0.72)",
                      }}
                    />
                  </span>
                ) : (
                  <span className="text-[0.56rem] font-semibold uppercase tracking-[0.16em]">
                    Select
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
