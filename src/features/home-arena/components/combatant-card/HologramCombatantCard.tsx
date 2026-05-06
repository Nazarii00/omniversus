"use client";

import { useState, type CSSProperties, type KeyboardEvent } from "react";
import type { ArenaCard } from "../../types";
import CardImagePlaceholder from "./CardImagePlaceholder";
import HologramCardFace from "./HologramCardFace";

type HologramCombatantCardProps = {
  card: ArenaCard;
  className?: string;
  disableLevitation?: boolean;
  onActivate?: () => void;
  activateLabel?: string;
};

export default function HologramCombatantCard({
  card,
  className = "",
  disableLevitation = false,
  onActivate,
  activateLabel,
}: HologramCombatantCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const levitationClass =
    card.side === "left"
      ? "home-card-levitate-left"
      : "home-card-levitate-right";
  const motionClass = disableLevitation ? "" : levitationClass;
  const themeStyle = {
    "--card-accent": card.theme.accent,
    "--card-accent-soft": card.theme.accentSoft,
    "--card-accent-glow": card.theme.accentGlow,
    "--card-accent-text": card.theme.accentText,
    "--card-secondary": card.theme.secondary,
  } as CSSProperties;

  function blockSpaceAndShift(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === " " || event.code === "Space" || event.key === "Shift") {
      event.preventDefault();
      event.stopPropagation();
    }
  }

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
      className={`group relative block aspect-[5/7] w-full min-w-0 cursor-pointer text-left outline-none [perspective:1500px] ${className}`}
      style={themeStyle}
    >
      <div
        className={`${motionClass} absolute inset-0 [transform-style:preserve-3d]`}
      >
        <div
          className="relative h-full w-full transition-transform duration-700 ease-out [transform-style:preserve-3d]"
          style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          <div
            className="absolute inset-y-2 -right-[0.95rem] w-[1.35rem] border-y border-r bg-[linear-gradient(90deg,#010201,#06110e_42%,#0a1613_58%,#010201)] [clip-path:polygon(0_0,72%_0,100%_0.7rem,100%_calc(100%-0.7rem),72%_100%,0_100%)] [transform:rotateY(90deg)_translateZ(0.64rem)] [transform-origin:left_center]"
            style={{
              borderColor: "var(--card-accent)",
              boxShadow: "inset 0 0 14px var(--card-accent-soft)",
            }}
          />
          <div
            className="absolute inset-x-3 -bottom-[0.95rem] h-[1.35rem] border-x border-b bg-[linear-gradient(180deg,#010201,#06110e_42%,#0a1613_58%,#010201)] [clip-path:polygon(0.7rem_0,calc(100%-0.7rem)_0,100%_48%,calc(100%-0.7rem)_100%,0.7rem_100%,0_48%)] [transform:rotateX(-90deg)_translateZ(0.64rem)] [transform-origin:top_center]"
            style={{
              borderColor: "var(--card-accent)",
              boxShadow: "inset 0 0 14px var(--card-accent-soft)",
            }}
          />
          <div
            className="absolute -inset-[0.28rem] border border-transparent transition-[border-color,box-shadow] duration-150 [clip-path:polygon(0.75rem_0,calc(100%-0.75rem)_0,100%_0.75rem,100%_calc(100%-0.75rem),calc(100%-0.75rem)_100%,0.75rem_100%,0_calc(100%-0.75rem),0_0.75rem)] group-hover:border-[var(--card-accent)] group-focus-visible:border-[var(--card-accent)]"
            style={{ boxShadow: "0 0 18px transparent" }}
          />

          <HologramCardFace theme={card.theme}>
            <div className="grid h-full grid-rows-[auto_58%_auto] gap-3">
              <div
                className="flex items-center justify-between text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--card-accent-text)" }}
              >
                <span>{card.serial}</span>
                <span>{card.powerIndex}</span>
              </div>

              <div className="min-h-0">
                <CardImagePlaceholder theme={card.theme} />
              </div>

              <div className="space-y-1.5 self-end">
                <p
                  className="text-[0.58rem] font-semibold uppercase tracking-[0.18em]"
                  style={{
                    color:
                      "color-mix(in srgb, var(--card-secondary) 68%, white 12%)",
                  }}
                >
                  {card.universe}
                </p>
                <h2
                  className="text-xl font-semibold uppercase leading-none tracking-[0.02em] text-white"
                  style={{ textShadow: "0 0 8px var(--card-accent-glow)" }}
                >
                  {card.name}
                </h2>
                <p
                  className="text-sm font-normal"
                  style={{
                    color:
                      "color-mix(in srgb, var(--card-accent-text) 78%, white 8%)",
                  }}
                >
                  {card.stance}
                </p>
              </div>
            </div>
          </HologramCardFace>

          <HologramCardFace theme={card.theme} isBack>
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="space-y-3">
                <p
                  className="text-[0.6rem] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--card-accent-text)" }}
                >
                  {card.serial} / Backplate
                </p>
                <h2
                  className="text-xl font-semibold uppercase leading-none tracking-[0.02em] text-white"
                  style={{ textShadow: "0 0 8px var(--card-accent-glow)" }}
                >
                  {card.backTitle}
                </h2>
                <p
                  className="text-sm leading-5"
                  style={{
                    color:
                      "color-mix(in srgb, var(--card-accent-text) 74%, white 8%)",
                  }}
                >
                  {card.backCopy}
                </p>
              </div>

              <div className="grid gap-2.5">
                {card.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-center justify-between border bg-black/38 px-3.5 py-2.5"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--card-accent) 30%, transparent)",
                    }}
                  >
                    <span
                      className="text-[0.58rem] font-semibold uppercase tracking-[0.16em]"
                      style={{
                        color:
                          "color-mix(in srgb, var(--card-secondary) 64%, white 12%)",
                      }}
                    >
                      {metric.label}
                    </span>
                    <span
                      className="text-sm font-semibold uppercase"
                      style={{ color: "var(--card-accent-text)" }}
                    >
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </HologramCardFace>
        </div>
      </div>
    </button>
  );
}
