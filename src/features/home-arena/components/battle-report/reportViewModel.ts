import type {
  BattleReportJson,
  ReportArgumentChain,
  ReportClaim,
  ReportComparisonRow,
  ReportFighter,
  ReportVerdict,
} from "../../types";

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

const FALLBACK_CLAIMS: ReportClaim[] = [
  {
    id: "fallback_claim_range",
    side: "B",
    category: "RANGE",
    text: "Omega can keep the exchange at a safer distance after the opening rush.",
    confidence: 72,
    source: {
      type: "UNKNOWN",
      ref: "Mock battle report placeholder",
      status: "REQUIRES_VERIFICATION",
    },
  },
  {
    id: "fallback_claim_pressure",
    side: "A",
    category: "WIN_CONDITION",
    text: "Alpha's clearest route is early pressure before Omega stabilizes spacing.",
    confidence: 67,
    contested: true,
    source: {
      type: "UNKNOWN",
      ref: "Mock battle report placeholder",
      status: "REQUIRES_VERIFICATION",
    },
  },
];

const FALLBACK_CHAINS: ReportArgumentChain[] = [
  {
    id: "fallback_chain_decisive",
    side: "B",
    chain_type: "WIN_CONDITION",
    title: "Range Stabilization",
    conclusion:
      "Omega survives the opening exchange and converts range control into the final route.",
    premises: [
      {
        id: "fallback_premise_1",
        role: "FACT",
        claim_id: "fallback_claim_range",
        text: "Omega's safe distance improves after the first exchange.",
      },
      {
        id: "fallback_premise_2",
        role: "COUNTERPOINT",
        claim_id: "fallback_claim_pressure",
        text: "Alpha's pressure matters most before that distance is established.",
        contested: true,
      },
    ],
    inference: "If Alpha cannot finish early, Omega's spacing becomes decisive.",
    confidence: 70,
    breaks_if: "Alpha has a verified instant route that ignores range.",
    linked_claim_ids: ["fallback_claim_range", "fallback_claim_pressure"],
  },
];

function clampScore(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function indexById<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

export function formatSide(
  side: string | undefined,
  fighters: ReportFighter[],
) {
  if (!side) return "SYSTEM";
  if (side === "TIE") return "TIE";
  if (side === "DRAW" || side === "INCONCLUSIVE") return side;
  if (side === "BOTH" || side === "SYSTEM") return side;

  const fighter = fighters.find((item) => item.side === side);
  return fighter ? `${side}:${fighter.name}` : side;
}

export function terminalLabel(text: string) {
  return text
    .trim()
    .split(/\s*\/\/\s*/)
    .map((part) => part.replace(/\s+/g, "_").toUpperCase())
    .join(" // ");
}

function scoreToY(value: number | null) {
  const score =
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(100, value))
      : 0;

  return 7 + ((100 - score) / 100) * 46;
}

export function buildSteppedPath(values: Array<number | null>) {
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

export function marginStrength(margin: string | undefined) {
  const normalized = margin?.toUpperCase() ?? "";

  if (normalized.includes("DECISIVE")) return 100;
  if (normalized.includes("LARGE")) return 92;
  if (normalized.includes("MEDIUM")) return 68;
  if (normalized.includes("SMALL")) return 42;
  if (normalized.includes("TIE") || normalized.includes("NONE")) return 24;

  return 54;
}

export function comparisonPreview(view: ReportViewModel) {
  return view.comparison.length
    ? view.comparison.slice(0, 4)
    : [
        {
          category: "WIN_CONDITION",
          winner: "B" as const,
          margin: "LARGE",
          reason: "Omega owns the more stable closing route.",
          claim_ids: ["fallback_claim_range"],
        },
        {
          category: "PRESSURE",
          winner: "A" as const,
          margin: "SMALL",
          reason: "Alpha has the better opening tempo.",
          claim_ids: ["fallback_claim_pressure"],
          contested: true,
        },
      ];
}

const RADAR_METRICS = [
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

function clampRadarScore(value: number) {
  return Math.max(18, Math.min(94, Math.round(value)));
}

function radarDelta(margin: string | undefined) {
  const normalized = margin?.toUpperCase() ?? "";

  if (!normalized || normalized.includes("NONE") || normalized.includes("TIE")) {
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
) {
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
  categories: string[],
) {
  const categorySet = new Set(categories);

  return rows.find((row) => categorySet.has(row.category.toUpperCase()));
}

export function buildRadarMetrics(view: ReportViewModel): ReportRadarMetric[] {
  const rows = view.comparison.length ? view.comparison : comparisonPreview(view);

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

export function normalizeReport(
  report: BattleReportJson = {},
): ReportViewModel {
  const fallbackFighters: ReportFighter[] = [
    { side: "A", name: "Contender Alpha" },
    { side: "B", name: "Contender Omega" },
  ];
  const fighters =
    report.fighters && report.fighters.length >= 2
      ? report.fighters
      : fallbackFighters;
  const claims = report.claims?.length ? report.claims : FALLBACK_CLAIMS;
  const chains = report.argument_chains?.length
    ? report.argument_chains
    : FALLBACK_CHAINS;
  const claimsById = indexById(claims);
  const chainsById = indexById(chains);
  const verdict = report.verdict ?? {};
  const decisiveChain =
    chainsById.get(verdict.decisive_chain_id ?? "") ??
    chains.find((chain) => chain.chain_type === "WIN_CONDITION") ??
    null;
  const rawSteps =
    report.narrative?.length === 5
      ? report.narrative
      : [
          {
            step: 1,
            title: "Opening Probe",
            log: "Alpha pushes tempo and tests whether Omega can keep distance.",
            a_hp: 92,
            b_hp: 84,
            why: "The first exchange decides whether Alpha's pressure route is real.",
            claim_ids: ["fallback_claim_pressure"],
            chain_ids: ["fallback_chain_decisive"],
            contested: true,
          },
          {
            step: 2,
            title: "Spacing Lock",
            log: "Omega exits the pocket and forces Alpha to spend actions crossing range.",
            a_hp: 74,
            b_hp: 78,
            why: "Repeated entry attempts lower Alpha's clean-finish probability.",
            claim_ids: ["fallback_claim_range"],
            chain_ids: ["fallback_chain_decisive"],
          },
          {
            step: 3,
            title: "Counter Window",
            log: "Omega punishes the next approach instead of trading directly.",
            a_hp: 46,
            b_hp: 70,
            why: "The decisive chain starts once Omega can choose the exchange timing.",
            claim_ids: ["fallback_claim_range"],
            chain_ids: ["fallback_chain_decisive"],
          },
          {
            step: 4,
            title: "Route Collapse",
            log: "Alpha's early-win route loses reliability after the failed close.",
            a_hp: 21,
            b_hp: 62,
            why: "Alpha still threatens, but no longer controls the next action.",
            claim_ids: ["fallback_claim_pressure"],
            chain_ids: ["fallback_chain_decisive"],
            contested: true,
          },
          {
            step: 5,
            title: "Final Conversion",
            log: "Omega converts the safer route into a finishing hit.",
            a_hp: 0,
            b_hp: 58,
            why: "Range control plus failed pressure resolves the verdict.",
            claim_ids: ["fallback_claim_range", "fallback_claim_pressure"],
            chain_ids: ["fallback_chain_decisive"],
          },
        ];

  const steps = rawSteps
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
        claims: claimIds.flatMap((id) => claimsById.get(id) ?? []),
        chains: chainIds.flatMap((id) => chainsById.get(id) ?? []),
      };
    });

  return {
    id: report.id ?? "battle_report",
    title: report.metadata?.title ?? report.headline ?? "Battle Report",
    headline: report.ui?.headline ?? report.headline ?? "BATTLE_REPORT",
    subheadline:
      report.ui?.subheadline ??
      report.verdict?.primary_reason ??
      "Terminal verdict stream loaded from battle JSON.",
    verdictStamp:
      report.ui?.verdict_stamp ??
      `${verdict.winner_name ?? "Winner"} WINS // ${
        verdict.difficulty ?? "MID_DIFF"
      }`,
    winnerName: verdict.winner_name ?? "Contender Omega",
    difficulty: verdict.difficulty ?? "MID_DIFF",
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
