import type {
  BattleReportJson,
  ReportArgumentChain,
  ReportChainPremise,
  ReportClaim,
  ReportComparisonRow,
  ReportFighter,
  ReportNarrativeStep,
  ReportVerdict,
} from "./types";
import {
  FALLBACK_CHAINS,
  FALLBACK_CLAIMS,
  FALLBACK_COMPARISON,
  FALLBACK_FIGHTERS,
  FALLBACK_NARRATIVE,
} from "./reportViewModelFallbacks";
import type {
  ReportRadarMetric,
  ReportTimelineStep,
  ReportViewModel,
} from "./viewModelTypes";

export type {
  ReportRadarMetric,
  ReportTimelineStep,
  ReportViewModel,
} from "./viewModelTypes";

const EXPECTED_NARRATIVE_STEP_COUNT = 5;
const MIN_FIGHTER_COUNT = 2;
const MAX_COMPARISON_PREVIEW_ROWS = 4;
const DEFAULT_REPORT_ID = "battle_report";
const DEFAULT_REPORT_TITLE = "Battle Report";
const DEFAULT_HEADLINE = "BATTLE_REPORT";
const DEFAULT_WINNER_NAME = "Contender Omega";
const DEFAULT_DIFFICULTY = "MID_DIFF";
const TECHNICAL_PREMISE_PATTERNS = [
  /^fallback premise from available claims\.?$/i,
  /^fallback rule premise; manual review recommended\.?$/i,
  /manual review recommended/i,
];

function clampScore(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;

  return Math.max(0, Math.min(100, Math.round(value)));
}

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

export function formatSide(
  side: string | undefined,
  fighters: ReportFighter[],
): string {
  if (!side) return "SYSTEM";
  if (side === "TIE") return "TIE";
  if (side === "DRAW" || side === "INCONCLUSIVE") return side;
  if (side === "BOTH" || side === "SYSTEM") return side;

  const fighter = fighters.find((item) => item.side === side);
  return fighter ? `${side}:${fighter.name}` : side;
}

export function terminalLabel(text: string): string {
  return text
    .trim()
    .split(/\s*\/\/\s*/)
    .map((part) => part.replace(/\s+/g, "_").toUpperCase())
    .join(" // ");
}

function scoreToY(value: number | null): number {
  const score =
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(100, value))
      : 0;

  return 7 + ((100 - score) / 100) * 46;
}

export function buildSteppedPath(values: Array<number | null>): string {
  if (!values.length) return "";

  const xStep = values.length > 1 ? 104 / (values.length - 1) : 0;
  const firstY = scoreToY(values[0] ?? 0);
  let path = `M 7 ${firstY}`;

  values.slice(1).forEach((value, index) => {
    const x = 7 + (index + 1) * xStep;
    path += ` H ${x} V ${scoreToY(value ?? 0)}`;
  });

  return path;
}

export function marginStrength(margin: string | undefined): number {
  const normalized = margin?.toUpperCase() ?? "";

  if (normalized.includes("DECISIVE")) return 100;
  if (normalized.includes("LARGE")) return 92;
  if (normalized.includes("MEDIUM")) return 68;
  if (normalized.includes("SMALL")) return 42;
  if (normalized.includes("TIE") || normalized.includes("NONE")) return 24;

  return 54;
}

export function comparisonPreview(
  view: ReportViewModel,
): ReportComparisonRow[] {
  return view.comparison.length
    ? view.comparison.slice(0, MAX_COMPARISON_PREVIEW_ROWS)
    : FALLBACK_COMPARISON.slice();
}

type RadarMetricConfig = {
  key: string;
  label: string;
  categories: readonly string[];
};

const RADAR_METRICS: RadarMetricConfig[] = [
  { key: "ap", label: "AP", categories: ["AP"] },
  {
    key: "durability",
    label: "DUR",
    categories: ["DURABILITY", "RESISTANCE"],
  },
  { key: "speed", label: "SPD", categories: ["SPEED"] },
  { key: "range", label: "RNG", categories: ["RANGE"] },
  {
    key: "ability",
    label: "ABL",
    categories: ["ABILITY", "SKILL", "INTELLIGENCE"],
  },
  {
    key: "win_condition",
    label: "WIN",
    categories: ["WIN_CONDITION", "CONSENSUS"],
  },
];

function clampRadarScore(value: number): number {
  return Math.max(18, Math.min(94, Math.round(value)));
}

function radarDelta(margin: string | undefined): number {
  const normalized = margin?.toUpperCase() ?? "";

  if (
    !normalized ||
    normalized.includes("NONE") ||
    normalized.includes("TIE")
  ) {
    return 0;
  }

  const strength = marginStrength(margin);

  if (strength >= 100) return 30;
  if (strength >= 92) return 26;
  if (strength >= 68) return 18;
  if (strength >= 42) return 10;

  return 0;
}

function radarScores(
  winner: ReportComparisonRow["winner"] | undefined,
  margin: string | undefined,
): Pick<ReportRadarMetric, "aScore" | "bScore"> {
  const base = 58;
  const delta = winner === "A" || winner === "B" ? radarDelta(margin) : 0;

  if (winner === "A") {
    return {
      aScore: clampRadarScore(base + delta),
      bScore: clampRadarScore(base - delta),
    };
  }

  if (winner === "B") {
    return {
      aScore: clampRadarScore(base - delta),
      bScore: clampRadarScore(base + delta),
    };
  }

  return { aScore: base, bScore: base };
}

function findComparisonRow(
  rows: ReportComparisonRow[],
  categories: readonly string[],
): ReportComparisonRow | undefined {
  const categorySet = new Set(categories);

  return rows.find((row) => categorySet.has(row.category.toUpperCase()));
}

export function buildRadarMetrics(view: ReportViewModel): ReportRadarMetric[] {
  const rows = view.comparison.length
    ? view.comparison
    : comparisonPreview(view);

  return RADAR_METRICS.map((metric) => {
    const row = findComparisonRow(rows, metric.categories);
    const scores = radarScores(row?.winner, row?.margin);

    return {
      key: metric.key,
      label: metric.label,
      aScore: scores.aScore,
      bScore: scores.bScore,
      winner: row?.winner,
      margin: row?.margin,
    };
  });
}

function resolveFighters(
  fighters: BattleReportJson["fighters"],
): ReportFighter[] {
  return fighters && fighters.length >= MIN_FIGHTER_COUNT
    ? fighters
    : FALLBACK_FIGHTERS;
}

function resolveClaims(claims: BattleReportJson["claims"]): ReportClaim[] {
  return claims?.length ? claims : FALLBACK_CLAIMS;
}

function isTechnicalPremise(premise: ReportChainPremise) {
  const text = premise.text.trim();

  return TECHNICAL_PREMISE_PATTERNS.some((pattern) => pattern.test(text));
}

function claimToPremise(
  claim: ReportClaim,
  premise?: ReportChainPremise,
): ReportChainPremise {
  return {
    id: premise?.id ?? `premise_${claim.id}`,
    role: "FACT",
    claim_id: claim.id,
    text: claim.text,
    contested: premise?.contested ?? claim.contested,
  };
}

function resolveDisplayPremises(
  chain: ReportArgumentChain,
  claimsById: Map<string, ReportClaim>,
): ReportChainPremise[] {
  const usedClaimIds = new Set<string>();
  const premises = chain.premises ?? [];
  const displayPremises = premises.flatMap((premise) => {
    if (!isTechnicalPremise(premise)) {
      if (premise.claim_id && premise.claim_id !== "N_A") {
        usedClaimIds.add(premise.claim_id);
      }

      return [premise];
    }

    const claim =
      premise.claim_id && premise.claim_id !== "N_A"
        ? claimsById.get(premise.claim_id)
        : undefined;

    if (!claim) return [];

    usedClaimIds.add(claim.id);
    return [claimToPremise(claim, premise)];
  });

  if (displayPremises.length) return displayPremises;

  return (chain.linked_claim_ids ?? [])
    .flatMap((claimId) => {
      if (usedClaimIds.has(claimId)) return [];

      const claim = claimsById.get(claimId);
      if (!claim) return [];

      usedClaimIds.add(claim.id);
      return [claimToPremise(claim)];
    })
    .slice(0, 3);
}

function resolveChains(
  chains: BattleReportJson["argument_chains"],
  claimsById: Map<string, ReportClaim>,
): ReportArgumentChain[] {
  const sourceChains = chains?.length ? chains : FALLBACK_CHAINS;

  return sourceChains.map((chain) => ({
    ...chain,
    premises: resolveDisplayPremises(chain, claimsById),
  }));
}

function resolveNarrative(
  narrative: BattleReportJson["narrative"],
): ReportNarrativeStep[] {
  return narrative?.length === EXPECTED_NARRATIVE_STEP_COUNT
    ? narrative
    : FALLBACK_NARRATIVE;
}

function resolveDecisiveChain(
  chainsById: Map<string, ReportArgumentChain>,
  chains: ReportArgumentChain[],
  verdict: ReportVerdict,
): ReportArgumentChain | null {
  return (
    chainsById.get(verdict.decisive_chain_id ?? "") ??
    chains.find((chain) => chain.chain_type === "WIN_CONDITION") ??
    null
  );
}

function recordsById<T extends { id: string }>(
  ids: string[],
  records: Map<string, T>,
): T[] {
  return ids.flatMap((id) => {
    const record = records.get(id);

    return record ? [record] : [];
  });
}

function buildTimelineSteps(
  rawSteps: ReportNarrativeStep[],
  claimsById: Map<string, ReportClaim>,
  chainsById: Map<string, ReportArgumentChain>,
): ReportTimelineStep[] {
  return rawSteps
    .slice()
    .sort((a, b) => a.step - b.step)
    .map((step) => {
      const claimIds = step.claim_ids ?? [];
      const chainIds = step.chain_ids ?? [];

      return {
        id: `step_${step.step}`,
        step: step.step,
        title: step.title,
        log: step.log,
        why: step.why,
        aHp: typeof step.a_hp === "number" ? step.a_hp : null,
        bHp: typeof step.b_hp === "number" ? step.b_hp : null,
        claimIds,
        chainIds,
        contested: Boolean(step.contested),
        claims: recordsById(claimIds, claimsById),
        chains: recordsById(chainIds, chainsById),
      };
    });
}

function buildVerdictStamp(verdict: ReportVerdict): string {
  return `${verdict.winner_name ?? "Winner"} WINS // ${
    verdict.difficulty ?? DEFAULT_DIFFICULTY
  }`;
}

export function normalizeReport(
  report: BattleReportJson = {},
): ReportViewModel {
  const fighters = resolveFighters(report.fighters);
  const claims = resolveClaims(report.claims);
  const claimsById = indexById(claims);
  const chains = resolveChains(report.argument_chains, claimsById);
  const chainsById = indexById(chains);
  const verdict = report.verdict ?? {};
  const decisiveChain = resolveDecisiveChain(chainsById, chains, verdict);
  const steps = buildTimelineSteps(
    resolveNarrative(report.narrative),
    claimsById,
    chainsById,
  );

  return {
    id: report.id ?? DEFAULT_REPORT_ID,
    title: report.metadata?.title ?? report.headline ?? DEFAULT_REPORT_TITLE,
    headline: report.ui?.headline ?? report.headline ?? DEFAULT_HEADLINE,
    subheadline:
      report.ui?.subheadline ??
      report.verdict?.primary_reason ??
      "Terminal verdict stream loaded from battle JSON.",
    verdictStamp: report.ui?.verdict_stamp ?? buildVerdictStamp(verdict),
    winnerName: verdict.winner_name ?? DEFAULT_WINNER_NAME,
    difficulty: verdict.difficulty ?? DEFAULT_DIFFICULTY,
    confidence: clampScore(verdict.confidence_score, 97),
    dataConfidence: clampScore(verdict.data_confidence_score, 72),
    robustnessConfidence: clampScore(
      verdict.verdict_confidence_robustness_score,
      76,
    ),
    chainTeaser:
      report.ui?.chain_teaser ??
      decisiveChain?.conclusion ??
      "Decisive route reconstructed from linked chain ids.",
    tags: report.ui?.tags ?? ["JSON_PARSED", "LOG_TRACE", "CHAIN_LINKED"],
    fighters,
    steps,
    comparison: report.comparison ?? [],
    claimsById,
    chainsById,
    decisiveChain,
    verdict,
    audit: report.audit ?? {},
  };
}
