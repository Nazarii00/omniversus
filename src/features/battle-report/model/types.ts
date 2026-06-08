import type {
  BattleGenerationMetadata,
  OmniversusBattle,
} from "@/server/battle/domain/schema";

export type ReportSide =
  | OmniversusBattle["claims"][number]["side"]
  | OmniversusBattle["verdict"]["winner_side"]
  | "TIE";

export type ReportSource = Partial<
  OmniversusBattle["claims"][number]["source"]
>;

export type ReportClaim = Partial<
  Omit<OmniversusBattle["claims"][number], "id" | "side" | "text" | "source">
> & {
  id: OmniversusBattle["claims"][number]["id"];
  side?: ReportSide;
  text: OmniversusBattle["claims"][number]["text"];
  source?: ReportSource;
};

export type ReportChainPremise = Partial<
  Omit<OmniversusBattle["argument_chains"][number]["premises"][number], "text">
> & {
  text: OmniversusBattle["argument_chains"][number]["premises"][number]["text"];
};

export type ReportArgumentChain = Partial<
  Omit<
    OmniversusBattle["argument_chains"][number],
    "id" | "side" | "title" | "conclusion" | "premises"
  >
> & {
  id: OmniversusBattle["argument_chains"][number]["id"];
  side?: ReportSide;
  title: OmniversusBattle["argument_chains"][number]["title"];
  conclusion: OmniversusBattle["argument_chains"][number]["conclusion"];
  premises?: ReportChainPremise[];
};

export type ReportComparisonRow = Partial<
  Omit<OmniversusBattle["comparison"][number], "category" | "winner" | "reason">
> & {
  category: OmniversusBattle["comparison"][number]["category"];
  winner?: ReportSide | "TIE";
  reason: OmniversusBattle["comparison"][number]["reason"];
};

export type ReportNarrativeStep = Partial<
  Omit<OmniversusBattle["narrative"][number], "step" | "title" | "log" | "why">
> & {
  step: OmniversusBattle["narrative"][number]["step"];
  title: OmniversusBattle["narrative"][number]["title"];
  log: OmniversusBattle["narrative"][number]["log"];
  why: OmniversusBattle["narrative"][number]["why"];
};

export type ReportFighter = Partial<
  Omit<
    OmniversusBattle["fighters"][number],
    "side" | "name" | "origin" | "tier" | "profile"
  >
> & {
  side: OmniversusBattle["fighters"][number]["side"];
  name: OmniversusBattle["fighters"][number]["name"];
  origin?: Partial<OmniversusBattle["fighters"][number]["origin"]>;
  tier?: Partial<OmniversusBattle["fighters"][number]["tier"]>;
  profile?: Partial<OmniversusBattle["fighters"][number]["profile"]>;
};

export type ReportVerdict = Partial<
  Omit<OmniversusBattle["verdict"], "winner_side">
> & {
  winner_side?: ReportSide;
};

export type ReportUi = Partial<OmniversusBattle["ui"]>;

export type BattleReportJson = Partial<
  Omit<
    OmniversusBattle,
    | "metadata"
    | "fighters"
    | "claims"
    | "argument_chains"
    | "comparison"
    | "narrative"
    | "verdict"
    | "ui"
    | "audit"
    | "quality_flags"
  >
> & {
  id?: string;
  battle_run_id?: string | null;
  cached?: boolean;
  status?: string;
  headline?: string;
  quality_score?: number | null;
  quality_band?: string | null;
  generation?: BattleGenerationMetadata;
  metadata?: Partial<OmniversusBattle["metadata"]>;
  fighters?: ReportFighter[];
  claims?: ReportClaim[];
  argument_chains?: ReportArgumentChain[];
  comparison?: ReportComparisonRow[];
  narrative?: ReportNarrativeStep[];
  verdict?: ReportVerdict;
  ui?: ReportUi;
  audit?: Partial<Record<string, string>>;
  quality_flags?: Partial<OmniversusBattle["quality_flags"]>;
};
