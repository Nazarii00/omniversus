import type { CSSProperties, ReactNode } from "react";
import type { ArenaCardTheme } from "../types";

const beveledClipPath =
  "polygon(0.82rem 0, calc(100% - 0.82rem) 0, 100% 0.82rem, 100% calc(100% - 0.82rem), calc(100% - 0.82rem) 100%, 0.82rem 100%, 0 calc(100% - 0.82rem), 0 0.82rem)";

type HologramCardFaceProps = {
  children: ReactNode;
  theme: ArenaCardTheme;
  isBack?: boolean;
};

export default function HologramCardFace({
  children,
  theme,
  isBack = false,
}: HologramCardFaceProps) {
  const themeStyle = {
    "--card-accent": theme.accent,
    "--card-accent-soft": theme.accentSoft,
    "--card-accent-glow": theme.accentGlow,
    "--card-secondary": theme.secondary,
  } as CSSProperties;

  return (
    <div
      className="absolute inset-0 overflow-hidden border border-zinc-100/38 bg-[linear-gradient(135deg,#d7d9d2_0%,#5b625b_7%,#202520_15%,#0a0d0b_38%,#313830_63%,#8d958a_79%,#151a16_100%)] p-[0.58rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24),inset_0_0_20px_rgba(0,0,0,0.82),0_14px_38px_rgba(0,0,0,0.68)] [backface-visibility:hidden]"
      style={{
        ...themeStyle,
        clipPath: beveledClipPath,
        transform: isBack
          ? "rotateY(180deg) translateZ(8px)"
          : "translateZ(8px)",
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.34),transparent_9%,transparent_57%,rgba(255,255,255,0.12)_63%,transparent_72%)] opacity-75" />
      <div
        className="absolute inset-[0.35rem] border border-black/70 bg-[linear-gradient(145deg,#050706,#171b16_42%,#030403)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
        style={{ clipPath: beveledClipPath }}
      />
      <div
        className="absolute inset-[0.72rem] border bg-[linear-gradient(180deg,rgba(5,10,8,0.86),rgba(8,18,13,0.9))]"
        style={{
          borderColor:
            "color-mix(in srgb, var(--card-accent) 42%, transparent)",
          boxShadow:
            "inset 0 0 26px rgba(0,0,0,0.62), inset 0 0 28px var(--card-accent-soft)",
          clipPath: beveledClipPath,
        }}
      />
      <div
        className="absolute inset-[0.72rem] bg-[linear-gradient(rgba(255,255,255,0.065)_1px,transparent_1px)] bg-[size:100%_5px] opacity-48"
        style={{ clipPath: beveledClipPath }}
      />
      <div className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-zinc-100/55" />
      <div className="absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-zinc-100/45" />
      <div className="absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-zinc-100/42" />
      <div className="absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-zinc-100/55" />
      <div
        className="absolute inset-x-5 top-4 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--card-accent), transparent)",
        }}
      />
      <div className="relative h-full p-4">{children}</div>
    </div>
  );
}
