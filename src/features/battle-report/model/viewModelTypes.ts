import type {
  ReportArgumentChain,
  ReportClaim,
  ReportComparisonRow,
  ReportFighter,
  ReportVerdict,
} from "./types";

export type ReportTimelineStep = {
  id: string;
  step: number;
  title: string;
  log: string;
  why: string;
  aHp: number | null;
  bHp: number | null;
  claimIds: string[];
  chainIds: string[];
  contested: boolean;
  claims: ReportClaim[];
  chains: ReportArgumentChain[];
};

export type ReportViewModel = {
  id: string;
  title: string;
  headline: string;
  subheadline: string;
  verdictStamp: string;
  winnerName: string;
  difficulty: string;
  confidence: number;
  dataConfidence: number;
  robustnessConfidence: number;
  chainTeaser: string;
  tags: string[];
  fighters: ReportFighter[];
  steps: ReportTimelineStep[];
  comparison: ReportComparisonRow[];
  claimsById: Map<string, ReportClaim>;
  chainsById: Map<string, ReportArgumentChain>;
  decisiveChain: ReportArgumentChain | null;
  verdict: ReportVerdict;
  audit: Partial<Record<string, string>>;
};

export type ReportRadarMetric = {
  key: string;
  label: string;
  aScore: number;
  bScore: number;
  winner: ReportComparisonRow["winner"] | undefined;
  margin: string | undefined;
};
