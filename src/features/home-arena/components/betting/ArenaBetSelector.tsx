"use client";

import type { KeyboardEvent } from "react";
import { betThemeStyle } from "../../logic";
import type { ArenaBetDraft, ArenaCard, ArenaCardSide } from "../../model";

type ArenaBetSelectorProps = {
  bet: ArenaBetDraft;
  disabled?: boolean;
  leftCard: ArenaCard;
  maxReputation: number;
  onBetChange: (bet: ArenaBetDraft) => void;
  rightCard: ArenaCard;
};

export default function ArenaBetSelector({
  bet,
  disabled = false,
  leftCard,
  maxReputation,
  onBetChange,
  rightCard,
}: ArenaBetSelectorProps) {
  const cards = [leftCard, rightCard];
  const amount = parseBetAmount(bet.amountText);
  const hasWagerOverflow = amount > maxReputation;

  function selectSide(side: ArenaCardSide) {
    if (disabled) return;

    onBetChange({ ...bet, side });
  }

  function handleZoneKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    side: ArenaCardSide,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectSide(side);
    }
  }

  return (
    <div className="w-full max-w-[49rem]">
      <p className="mb-3 text-center text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[#d7e2d6]/70">
        PLACE YOUR BET
      </p>

      <div className="grid grid-cols-[minmax(0,1fr)_1rem_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)]">
        {cards.map((card) => {
          const isSelected = bet.side === card.side;
          const columnClass =
            card.side === "left" ? "col-start-1" : "col-start-3";
          const themeStyle = betThemeStyle(card.theme);

          return (
            <div
              key={card.id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-disabled={disabled}
              aria-pressed={isSelected}
              className={`${columnClass} home-bet-choice relative h-32 cursor-pointer overflow-hidden px-4 py-4 text-left outline-none transition-[border-color,box-shadow,filter,opacity] duration-150 sm:h-36 sm:px-5`}
              data-locked={disabled ? "true" : undefined}
              data-selected={isSelected}
              onClick={() => selectSide(card.side)}
              onKeyDown={(event) => handleZoneKeyDown(event, card.side)}
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
                      max={maxReputation}
                      placeholder="0"
                      value={bet.amountText}
                      disabled={disabled}
                      onChange={(event) =>
                        onBetChange({
                          ...bet,
                          amountText: normalizeBetAmountText(
                            event.target.value,
                          ),
                        })
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

      <p
        className="home-bet-status mt-2 text-center text-[0.55rem] font-semibold uppercase tracking-[0.16em]"
        data-warning={hasWagerOverflow ? "true" : undefined}
      >
        {hasWagerOverflow
          ? `INSUFFICIENT_REPUTATION / MAX ${maxReputation}`
          : `STAKE ${amount} REP / CREDIT COST 1`}
      </p>
    </div>
  );
}

function normalizeBetAmountText(value: string) {
  const normalized = value.replace(/\D/g, "").slice(0, 6);

  if (!normalized) return "";

  return Math.floor(Number(normalized)).toString();
}

function parseBetAmount(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) return 0;

  return Math.floor(amount);
}
