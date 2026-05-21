import type { ArenaCard, CardCrtGlitchImpact } from "../../../model";
import { CardCrtGlitchOverlay } from "../effects";
import CardImagePlaceholder from "./CardImagePlaceholder";
import HologramCardFace from "./HologramCardFace";

type HologramCombatantCardFaceProps = {
  card: ArenaCard;
  crtImpact?: CardCrtGlitchImpact | null;
  crtResetToken: number;
  isEliminated?: boolean;
};

function CardCrtOverlay({
  card,
  crtImpact,
  crtResetToken,
  isEliminated = false,
}: HologramCombatantCardFaceProps) {
  return (
    <CardCrtGlitchOverlay
      impact={crtImpact}
      isTerminal={isEliminated}
      resetToken={crtResetToken}
      side={card.side}
    />
  );
}

export function HologramCombatantFrontFace({
  card,
  crtImpact,
  crtResetToken,
  isEliminated = false,
}: HologramCombatantCardFaceProps) {
  return (
    <HologramCardFace
      theme={card.theme}
      overlay={
        <CardCrtOverlay
          card={card}
          crtImpact={crtImpact}
          crtResetToken={crtResetToken}
          isEliminated={isEliminated}
        />
      }
    >
      <div className="grid h-full grid-rows-[auto_58%_auto] gap-3">
        <div
          className="flex items-center justify-between text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "var(--card-accent-text)" }}
        >
          <span>{card.serial}</span>
          <span>{card.powerIndex}</span>
        </div>

        <div className="min-h-0">
          <CardImagePlaceholder
            alt={`${card.name} approved portrait`}
            imageUrl={card.portraitUrl}
            theme={card.theme}
          />
        </div>

        <div className="space-y-1.5 self-end">
          <p
            className="text-[0.58rem] font-semibold uppercase tracking-[0.18em]"
            style={{
              color: "color-mix(in srgb, var(--card-secondary) 68%, white 12%)",
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
  );
}

export function HologramCombatantBackFace({
  card,
  crtImpact,
  crtResetToken,
  isEliminated = false,
}: HologramCombatantCardFaceProps) {
  return (
    <HologramCardFace
      theme={card.theme}
      isBack
      overlay={
        <CardCrtOverlay
          card={card}
          crtImpact={crtImpact}
          crtResetToken={crtResetToken}
          isEliminated={isEliminated}
        />
      }
    >
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
  );
}
