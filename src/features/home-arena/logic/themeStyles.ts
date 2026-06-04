import type { CSSProperties } from "react";
import type { ArenaCardTheme } from "../model";

type ThemeStylePrefix = "bet" | "card" | "entry";

type PrefixedThemeStyle<Prefix extends ThemeStylePrefix> = CSSProperties &
  Record<`--${Prefix}-accent`, string> &
  Record<`--${Prefix}-accent-soft`, string> &
  Record<`--${Prefix}-accent-glow`, string> &
  Record<`--${Prefix}-accent-text`, string> &
  Record<`--${Prefix}-secondary`, string>;

function createThemeStyle<Prefix extends ThemeStylePrefix>(
  prefix: Prefix,
  theme: ArenaCardTheme,
): PrefixedThemeStyle<Prefix> {
  return {
    [`--${prefix}-accent`]: theme.accent,
    [`--${prefix}-accent-soft`]: theme.accentSoft,
    [`--${prefix}-accent-glow`]: theme.accentGlow,
    [`--${prefix}-accent-text`]: theme.accentText,
    [`--${prefix}-secondary`]: theme.secondary,
  } as PrefixedThemeStyle<Prefix>;
}

export function betThemeStyle(theme: ArenaCardTheme) {
  return createThemeStyle("bet", theme);
}

export function cardThemeStyle(theme: ArenaCardTheme) {
  return createThemeStyle("card", theme);
}

export function entryThemeStyle(theme: ArenaCardTheme) {
  return createThemeStyle("entry", theme);
}
