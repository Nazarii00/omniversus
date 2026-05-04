import type { CSSProperties } from "react";
import type { ArenaCardSide, ArenaCardTheme } from "../types";

type CardDockSlotProps = {
  side: ArenaCardSide;
  theme: ArenaCardTheme;
};

export default function CardDockSlot({ side, theme }: CardDockSlotProps) {
  const railOffset = side === "left" ? "left-3" : "right-3";
  const themeStyle = {
    "--card-accent": theme.accent,
    "--card-accent-soft": theme.accentSoft,
    "--card-accent-glow": theme.accentGlow,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="absolute -inset-x-6 -inset-y-5 z-0 translate-y-6 border bg-black/54 shadow-[inset_0_0_34px_rgba(0,0,0,0.96),0_18px_58px_rgba(0,0,0,0.68)] [clip-path:polygon(1rem_0,calc(100%-1rem)_0,100%_1rem,100%_calc(100%-1rem),calc(100%-1rem)_100%,1rem_100%,0_calc(100%-1rem),0_1rem)]"
      style={{
        ...themeStyle,
        borderColor: "color-mix(in srgb, var(--card-accent) 45%, #010201)",
      }}
    >
      <div
        className="absolute inset-3 border bg-[linear-gradient(145deg,rgba(0,12,10,0.86),rgba(0,0,0,0.32)_48%,rgba(0,37,31,0.62))] [clip-path:polygon(0.8rem_0,calc(100%-0.8rem)_0,100%_0.8rem,100%_calc(100%-0.8rem),calc(100%-0.8rem)_100%,0.8rem_100%,0_calc(100%-0.8rem),0_0.8rem)]"
        style={{
          borderColor:
            "color-mix(in srgb, var(--card-accent) 20%, transparent)",
        }}
      />
      <div
        className="absolute inset-x-8 top-6 h-px"
        style={{
          background: "var(--card-accent)",
          boxShadow: "0 0 18px var(--card-accent-glow)",
          opacity: 0.34,
        }}
      />
      <div
        className="absolute inset-x-8 bottom-6 h-px"
        style={{
          background: "var(--card-accent)",
          boxShadow: "0 0 18px var(--card-accent-glow)",
          opacity: 0.28,
        }}
      />
      <div
        className={`absolute ${railOffset} inset-y-8 w-px`}
        style={{
          background: "var(--card-accent)",
          boxShadow: "0 0 16px var(--card-accent-glow)",
          opacity: 0.24,
        }}
      />
      <div
        className="home-card-dock-scan absolute inset-x-7 top-1/2 h-12 -translate-y-1/2 border-y bg-white/[0.025]"
        style={{
          borderColor:
            "color-mix(in srgb, var(--card-accent) 18%, transparent)",
        }}
      />
    </div>
  );
}
