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
  portraitUrl?: string;
  serial: string;
  powerIndex: string;
  stance: string;
  backTitle: string;
  backCopy: string;
  theme: ArenaCardTheme;
  metrics: ArenaCardMetric[];
};

export type ArenaBetDraft = {
  amountText: string;
  side: ArenaCardSide;
};

export type ArenaLockedBet = {
  amount: number;
  side: ArenaCardSide;
};

export type ArenaBetSettlement = {
  payout: number;
  status: string;
};

export type ArenaWallet = {
  credits: number;
  reputation: number;
};

export type CardCrtGlitchImpact = {
  act: number;
  hp: number;
  runId: number;
};

export type CombatantOption = {
  id: string;
  name: string;
  universe: string;
  aliases?: string[];
  portraitUrl?: string;
  subjectId?: string;
  summary?: string;
  versionId?: string;
  versionLabel?: string;
};
