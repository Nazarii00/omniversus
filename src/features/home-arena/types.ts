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

export type ReportSide =
  | "A"
  | "B"
  | "BOTH"
  | "SYSTEM"
  | "DRAW"
  | "INCONCLUSIVE";

export type ReportSource = {
  type?: string;
  ref?: string;
  status?: string;
  reliability?: string;
  note?: string;
};

export type ReportClaim = {
  id: string;
  side?: ReportSide;
  kind?: string;
  tag?: string;
  category?: string;
  text: string;
  source?: ReportSource;
  evidence_level?: string;
  importance?: string;
  confidence?: number;
  supports_verdict?: boolean;
  contested?: boolean;
  outlier?: boolean;
  appeal_hint?: string;
};

export type ReportChainPremise = {
  id?: string;
  role?: string;
  claim_id?: string;
  text: string;
  contested?: boolean;
};

export type ReportArgumentChain = {
  id: string;
  side?: ReportSide;
  chain_type?: string;
  title: string;
  conclusion: string;
  premises?: ReportChainPremise[];
  inference_rule?: string;
  inference?: string;
  confidence?: number;
  contested?: boolean;
  breaks_if?: string;
  linked_claim_ids?: string[];
};

export type ReportComparisonRow = {
  category: string;
  winner?: ReportSide | "TIE";
  margin?: string;
  reason: string;
  claim_ids?: string[];
  contested?: boolean;
};

export type ReportNarrativeStep = {
  step: number;
  title: string;
  log: string;
  a_hp?: number;
  b_hp?: number;
  why: string;
  claim_ids?: string[];
  chain_ids?: string[];
  contested?: boolean;
};

export type ReportFighter = {
  side: "A" | "B";
  name: string;
  version?: string;
  verse?: string;
  tier?: {
    rating?: string;
    basis?: string;
  };
};

export type ReportVerdict = {
  winner_side?: ReportSide;
  winner_name?: string;
  difficulty?: string;
  confidence_score?: number;
  data_confidence_score?: number;
  verdict_confidence_given_data_score?: number;
  verdict_confidence_robustness_score?: number;
  confidence_explanation?: string;
  primary_reason?: string;
  decisive_chain_id?: string;
  loser_best_argument?: string;
  why_not_other_side?: string;
  flip_condition?: string;
  key_factors?: string[];
  risk_factors?: string[];
  recommended_rematch?: string;
  summary_3_sentences?: string;
};

export type ReportUi = {
  headline?: string;
  subheadline?: string;
  share_text?: string;
  verdict_stamp?: string;
  chain_teaser?: string;
  tags?: string[];
  card_variant?: string;
  primary_badge?: string;
};

export type BattleReportJson = {
  id?: string;
  status?: string;
  headline?: string;
  metadata?: {
    title?: string;
    battle_type?: string;
    canon_scope?: string;
    speed_equalized?: boolean;
    assumptions?: string;
  };
  fighters?: ReportFighter[];
  claims?: ReportClaim[];
  argument_chains?: ReportArgumentChain[];
  comparison?: ReportComparisonRow[];
  narrative?: ReportNarrativeStep[];
  verdict?: ReportVerdict;
  ui?: ReportUi;
  audit?: Partial<Record<string, string>>;
  quality_flags?: {
    has_unverified_sources?: boolean;
    has_contested_scaling?: boolean;
    has_possible_outliers?: boolean;
    has_mechanics_mismatch?: boolean;
    has_confidence_cap?: boolean;
    has_data_input_warning?: boolean;
    has_chain_gap?: boolean;
    most_fragile_assumption?: string;
  };
};
