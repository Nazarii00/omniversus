import type { ArenaCardTheme } from "../../../model";
import { cardThemeStyle } from "../../../logic";

type CardImagePlaceholderProps = {
  theme: ArenaCardTheme;
};

export default function CardImagePlaceholder({
  theme,
}: CardImagePlaceholderProps) {
  const themeStyle = cardThemeStyle(theme);

  return (
    <div
      className="home-battle-card-media relative h-full min-h-0 overflow-hidden border bg-black/54 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] [clip-path:polygon(0.45rem_0,calc(100%-0.45rem)_0,100%_0.45rem,100%_calc(100%-0.45rem),calc(100%-0.45rem)_100%,0.45rem_100%,0_calc(100%-0.45rem),0_0.45rem)]"
      style={{
        ...themeStyle,
        borderColor: "color-mix(in srgb, var(--card-accent) 46%, transparent)",
        boxShadow: "inset 0 0 30px var(--card-accent-soft)",
      }}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(255,255,255,0.09),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.045),transparent_28%,rgba(0,0,0,0.68)),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_38%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 opacity-48"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--card-accent) 15%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--card-accent) 12%, transparent) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div
        className="absolute inset-3 border [clip-path:polygon(0.34rem_0,calc(100%-0.34rem)_0,100%_0.34rem,100%_calc(100%-0.34rem),calc(100%-0.34rem)_100%,0.34rem_100%,0_calc(100%-0.34rem),0_0.34rem)]"
        aria-hidden="true"
        style={{
          borderColor:
            "color-mix(in srgb, var(--card-accent) 34%, transparent)",
        }}
      />
      <div
        className="absolute left-1/2 top-[17%] h-14 w-14 -translate-x-1/2 rounded-full border bg-white/5"
        aria-hidden="true"
        style={{
          borderColor:
            "color-mix(in srgb, var(--card-accent) 45%, transparent)",
        }}
      />
      <div
        className="absolute inset-x-7 bottom-6 h-20 border bg-white/[0.025]"
        aria-hidden="true"
        style={{
          borderColor:
            "color-mix(in srgb, var(--card-accent) 24%, transparent)",
        }}
      />
      <div
        className="absolute bottom-4 left-4 right-4 h-px"
        aria-hidden="true"
        style={{
          background: "var(--card-accent)",
          boxShadow: "0 0 14px var(--card-accent)",
        }}
      />
    </div>
  );
}
