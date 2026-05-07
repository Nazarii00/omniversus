export type ArenaCardMetric = {
  label: string;
  value: string;
};

export type ArenaCardSide = "left" | "right";

export type ArenaCardTheme = {
  accent: string;
  accentSoft: string;
  accentGlow: string;
  accentText: string;
  secondary: string;
};

export type ArenaCard = {
  id: string;
  side: ArenaCardSide;
  name: string;
  universe: string;
  serial: string;
  powerIndex: string;
  stance: string;
  backTitle: string;
  backCopy: string;
  theme: ArenaCardTheme;
  metrics: ArenaCardMetric[];
};

export type CombatantOption = {
  id: string;
  name: string;
  universe: string;
  aliases?: string[];
};
