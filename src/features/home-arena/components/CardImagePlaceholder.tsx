import type { CSSProperties } from "react";
import type { ArenaCardTheme } from "../types";

type CardImagePlaceholderProps = {
  theme: ArenaCardTheme;
};

export default function CardImagePlaceholder({
  theme,
}: CardImagePlaceholderProps) {
  const themeStyle = {
    "--card-accent": theme.accent,
    "--card-accent-soft": theme.accentSoft,
    "--card-secondary": theme.secondary,
  } as CSSProperties;

  return (
    <div
      className="relative h-full min-h-0 overflow-hidden border bg-black/54 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] [clip-path:polygon(0.45rem_0,calc(100%-0.45rem)_0,100%_0.45rem,100%_calc(100%-0.45rem),calc(100%-0.45rem)_100%,0.45rem_100%,0_calc(100%-0.45rem),0_0.45rem)]"
      style={{
        ...themeStyle,
        borderColor: "color-mix(in srgb, var(--card-accent) 46%, transparent)",
        boxShadow: "inset 0 0 30px var(--card-accent-soft)",
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,var(--card-accent-soft),transparent_29%),linear-gradient(135deg,rgba(217,255,63,0.1),transparent_41%,var(--card-accent-soft))]" />
      <div className="absolute inset-3 border border-white/14 [clip-path:polygon(0.34rem_0,calc(100%-0.34rem)_0,100%_0.34rem,100%_calc(100%-0.34rem),calc(100%-0.34rem)_100%,0.34rem_100%,0_calc(100%-0.34rem),0_0.34rem)]" />
      <div
        className="absolute left-1/2 top-[17%] h-14 w-14 -translate-x-1/2 rounded-full border bg-white/5"
        style={{
          borderColor:
            "color-mix(in srgb, var(--card-accent) 45%, transparent)",
        }}
      />
      <div
        className="absolute inset-x-7 bottom-6 h-20 border bg-white/[0.025]"
        style={{
          borderColor:
            "color-mix(in srgb, var(--card-accent) 24%, transparent)",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:17px_17px] opacity-48" />
      <div
        className="absolute bottom-4 left-4 right-4 h-px"
        style={{
          background: "var(--card-accent)",
          boxShadow: "0 0 14px var(--card-accent)",
        }}
      />
    </div>
  );
}
