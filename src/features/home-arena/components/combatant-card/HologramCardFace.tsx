import type { CSSProperties, ReactNode } from "react";
import type { ArenaCardTheme } from "../../types";

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
      className="absolute inset-0 overflow-hidden border-2 bg-[linear-gradient(135deg,#06100d_0%,#020403_26%,#06110f_70%,#010201_100%)] p-[0.58rem] [backface-visibility:hidden]"
      style={{
        ...themeStyle,
        borderColor: "var(--card-accent)",
        boxShadow:
          "inset 0 0 0 3px #010201, inset 0 0 0 4px color-mix(in srgb, var(--card-accent) 64%, #010201), inset 0 0 28px rgba(0,0,0,0.94), 0 0 22px var(--card-accent-glow), 0 14px 38px rgba(0,0,0,0.72)",
        clipPath: beveledClipPath,
        transform: isBack
          ? "rotateY(180deg) translateZ(8px)"
          : "translateZ(8px)",
      }}
    >
      <div
        className="absolute inset-[0.35rem] border bg-[#010201] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.88)]"
        style={{
          borderColor: "color-mix(in srgb, var(--card-accent) 72%, #010201)",
          clipPath: beveledClipPath,
        }}
      />
      <div
        className="absolute inset-[0.58rem] bg-[linear-gradient(145deg,#020403,#06110e_44%,#010201)]"
        style={{ clipPath: beveledClipPath }}
      />
      <div
        className="absolute inset-[0.72rem] border bg-[linear-gradient(180deg,rgba(1,7,6,0.96),rgba(2,11,9,0.98))]"
        style={{
          borderColor:
            "color-mix(in srgb, var(--card-accent) 58%, #010201)",
          boxShadow:
            "inset 0 0 24px rgba(0,0,0,0.82), inset 0 0 22px var(--card-accent-soft), 0 0 10px var(--card-accent-glow)",
          clipPath: beveledClipPath,
        }}
      />
      <div
        className="absolute inset-[0.72rem] bg-[linear-gradient(rgba(255,255,255,0.065)_1px,transparent_1px)] bg-[size:100%_5px] opacity-48"
        style={{ clipPath: beveledClipPath }}
      />
      <div
        className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2"
        style={{ borderColor: "var(--card-accent)" }}
      />
      <div
        className="absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2"
        style={{ borderColor: "var(--card-accent)" }}
      />
      <div
        className="absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2"
        style={{ borderColor: "var(--card-accent)" }}
      />
      <div
        className="absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2"
        style={{ borderColor: "var(--card-accent)" }}
      />
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
