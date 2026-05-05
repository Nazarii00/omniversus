"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

type ReportSide = "A" | "B" | "BOTH" | "SYSTEM" | "DRAW" | "INCONCLUSIVE";

type ReportSource = {
  type?: string;
  ref?: string;
  status?: string;
  reliability?: string;
  note?: string;
};

type ReportClaim = {
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

type ReportChainPremise = {
  id?: string;
  role?: string;
  claim_id?: string;
  text: string;
  contested?: boolean;
};

type ReportArgumentChain = {
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

type ReportComparisonRow = {
  category: string;
  winner?: ReportSide | "TIE";
  margin?: string;
  reason: string;
  claim_ids?: string[];
  contested?: boolean;
};

type ReportNarrativeStep = {
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

type ReportFighter = {
  side: "A" | "B";
  name: string;
  version?: string;
  verse?: string;
  tier?: {
    rating?: string;
    basis?: string;
  };
};

type ReportVerdict = {
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

type ReportUi = {
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

type BattleResultPanelProps = {
  playIntro: boolean;
  report?: BattleReportJson;
};

type ReportTimelineStep = {
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

type ReportViewModel = {
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

type ModalItem = {
  id: string;
  title: string;
  meta: string;
  text: string;
  lines?: string[];
};

type ReportModalPayload = {
  eyebrow: string;
  title: string;
  command: string;
  intro: string;
  metaRows: Array<[string, string]>;
  claims: ModalItem[];
  chains: ModalItem[];
};

type LockedDetailPreview = {
  chains: number;
  claims: number;
  firstChainLabel: string;
  firstClaimLabel: string;
};

const CONTENT_INTRO_DELAY_MS = 780;

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

function compactList(values: Array<string | undefined>) {
  return values.filter((value): value is string => Boolean(value?.trim()));
}

function indexById<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function formatSide(side: string | undefined, fighters: ReportFighter[]) {
  if (!side) return "SYSTEM";
  if (side === "TIE") return "TIE";
  if (side === "DRAW" || side === "INCONCLUSIVE") return side;
  if (side === "BOTH" || side === "SYSTEM") return side;

  const fighter = fighters.find((item) => item.side === side);
  return fighter ? `${side}:${fighter.name}` : side;
}

function formatSource(source: ReportSource | undefined) {
  if (!source) return "source:N_A";

  return compactList([
    source.type,
    source.status,
    source.reliability,
    source.ref,
  ]).join(" // ");
}

function terminalLabel(text: string) {
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

function buildSteppedPath(values: Array<number | null>) {
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

function buildStageDensity(steps: ReportTimelineStep[]) {
  const maxClaims = Math.max(1, ...steps.map((step) => step.claimIds.length));
  const maxChains = Math.max(1, ...steps.map((step) => step.chainIds.length));

  return steps.map((step) => ({
    id: step.id,
    label: String(step.step).padStart(2, "0"),
    claims: Math.max(12, Math.round((step.claimIds.length / maxClaims) * 100)),
    chains: Math.max(12, Math.round((step.chainIds.length / maxChains) * 100)),
  }));
}

function marginStrength(margin: string | undefined) {
  const normalized = margin?.toUpperCase() ?? "";

  if (normalized.includes("LARGE")) return 92;
  if (normalized.includes("MEDIUM")) return 68;
  if (normalized.includes("SMALL")) return 42;
  if (normalized.includes("TIE")) return 24;

  return 54;
}

function comparisonPreview(view: ReportViewModel) {
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

function normalizeReport(report: BattleReportJson = {}): ReportViewModel {
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
      `${verdict.winner_name ?? "Winner"} WINS // ${verdict.difficulty ?? "MID_DIFF"}`,
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

function buildClaimItem(claim: ReportClaim, fighters: ReportFighter[]): ModalItem {
  return {
    id: claim.id,
    title: `${claim.category ?? "CLAIM"} // ${claim.id}`,
    meta: compactList([
      formatSide(claim.side, fighters),
      `conf:${claim.confidence ?? "N_A"}`,
      claim.contested ? "contested:true" : undefined,
      claim.outlier ? "outlier:true" : undefined,
    ]).join(" | "),
    text: claim.text,
    lines: compactList([
      `source: ${formatSource(claim.source)}`,
      claim.evidence_level ? `evidence: ${claim.evidence_level}` : undefined,
      claim.appeal_hint ? `appeal: ${claim.appeal_hint}` : undefined,
    ]),
  };
}

function buildChainItem(
  chain: ReportArgumentChain,
  fighters: ReportFighter[],
): ModalItem {
  return {
    id: chain.id,
    title: `${chain.chain_type ?? "CHAIN"} // ${chain.title}`,
    meta: compactList([
      formatSide(chain.side, fighters),
      `conf:${chain.confidence ?? "N_A"}`,
      chain.contested ? "contested:true" : undefined,
    ]).join(" | "),
    text: chain.conclusion,
    lines: compactList([
      ...(chain.premises ?? []).map(
        (premise, index) =>
          `premise_${index + 1}: ${premise.text}${
            premise.claim_id ? ` [${premise.claim_id}]` : ""
          }`,
      ),
      chain.inference ? `inference: ${chain.inference}` : undefined,
      chain.breaks_if ? `breaks_if: ${chain.breaks_if}` : undefined,
    ]),
  };
}

function buildStepModal(
  step: ReportTimelineStep,
  view: ReportViewModel,
): ReportModalPayload {
  const fighterA = view.fighters.find((fighter) => fighter.side === "A");
  const fighterB = view.fighters.find((fighter) => fighter.side === "B");
  const hpTrace = compactList([
    step.aHp !== null ? `${fighterA?.name ?? "Alpha"} ${step.aHp}%` : undefined,
    step.bHp !== null ? `${fighterB?.name ?? "Omega"} ${step.bHp}%` : undefined,
  ]).join(" / ");

  return {
    eyebrow: `BATTLE STAGE ${String(step.step).padStart(2, "0")}`,
    title: step.title,
    command: `> open public summary for stage_${String(step.step).padStart(2, "0")}`,
    intro: step.why,
    metaRows: [
      ["what happened", step.log],
      ["health after stage", hpTrace || "N_A"],
      ["detail status", step.contested ? "contested / locked" : "stable / locked"],
    ],
    claims: step.claims.map((claim) => buildClaimItem(claim, view.fighters)),
    chains: step.chains.map((chain) => buildChainItem(chain, view.fighters)),
  };
}

function buildChainModal(
  chain: ReportArgumentChain,
  view: ReportViewModel,
): ReportModalPayload {
  const linkedClaims = (chain.linked_claim_ids ?? []).flatMap(
    (id) => view.claimsById.get(id) ?? [],
  );

  return {
    eyebrow: "KEY ROUTE",
    title: chain.title,
    command: `> open route summary --proof=${linkedClaims.length}_locked_items`,
    intro: chain.conclusion,
    metaRows: [
      ["favored side", formatSide(chain.side, view.fighters)],
      ["route confidence", `${chain.confidence ?? "N_A"}%`],
      ["could change if", chain.breaks_if ?? "N_A"],
    ],
    claims: linkedClaims.map((claim) => buildClaimItem(claim, view.fighters)),
    chains: [buildChainItem(chain, view.fighters)],
  };
}

function buildComparisonModal(
  row: ReportComparisonRow,
  view: ReportViewModel,
): ReportModalPayload {
  const claims = (row.claim_ids ?? []).flatMap(
    (id) => view.claimsById.get(id) ?? [],
  );

  return {
    eyebrow: "CATEGORY EDGE",
    title: row.category,
    command: `> open category summary --evidence=${claims.length}_locked_items`,
    intro: row.reason,
    metaRows: [
      ["edge", formatSide(row.winner, view.fighters)],
      ["margin", row.margin ?? "N_A"],
      ["detail status", row.contested ? "contested / locked" : "stable / locked"],
    ],
    claims: claims.map((claim) => buildClaimItem(claim, view.fighters)),
    chains: [],
  };
}

function buildLockedPreview(payload: ReportModalPayload): LockedDetailPreview {
  return {
    chains: payload.chains.length,
    claims: payload.claims.length,
    firstChainLabel: payload.chains[0]?.title ?? "CHAIN_DATA",
    firstClaimLabel: payload.claims[0]?.title ?? "CLAIM_DATA",
  };
}

function ReportSignalDeck({
  view,
  style,
  onOpenComparison,
}: {
  view: ReportViewModel;
  style: CSSProperties;
  onOpenComparison: (row: ReportComparisonRow) => void;
}) {
  const fighterA = view.fighters.find((fighter) => fighter.side === "A");
  const fighterB = view.fighters.find((fighter) => fighter.side === "B");
  const alphaValues = view.steps.map((step) => step.aHp);
  const omegaValues = view.steps.map((step) => step.bHp);
  const density = buildStageDensity(view.steps);

  return (
    <div
      className="home-battle-result-panel__section home-report-signal-deck"
      style={style}
    >
      <div className="home-report-panel-heading">
        <span>&gt; SIGNAL_GRID</span>
        <span>PUBLIC_TRACE</span>
      </div>

      <div className="home-report-signal-chart">
        <div className="home-report-signal-chart__top">
          <span>HP_STEP_TRACE</span>
          <span>{view.steps.length}_NODES</span>
        </div>
        <svg
          viewBox="0 0 118 62"
          preserveAspectRatio="none"
          aria-label="Health step trace"
          shapeRendering="crispEdges"
        >
          <path
            className="home-report-signal-chart__path home-report-signal-chart__path--alpha"
            d={buildSteppedPath(alphaValues)}
          />
          <path
            className="home-report-signal-chart__path home-report-signal-chart__path--omega"
            d={buildSteppedPath(omegaValues)}
          />
        </svg>
        <div className="home-report-signal-chart__legend">
          <span>
            <i data-side="alpha" />
            A_HP: {terminalLabel(fighterA?.name ?? "Alpha")}
          </span>
          <span>
            <i data-side="omega" />
            B_HP: {terminalLabel(fighterB?.name ?? "Omega")}
          </span>
        </div>
      </div>

      <div className="home-report-signal-density" aria-label="Claim and chain density">
        <div className="home-report-signal-density__top">
          <span>LINK_DENSITY</span>
          <span>CLAIMS/CHAINS</span>
        </div>
        <div className="home-report-signal-density__bars">
          {density.map((item) => (
            <span key={item.id} className="home-report-signal-density__bar">
              <i
                style={
                  {
                    "--signal-height": `${item.claims}%`,
                  } as CSSProperties
                }
              />
              <b
                style={
                  {
                    "--signal-height": `${item.chains}%`,
                  } as CSSProperties
                }
              />
              <em>{item.label}</em>
            </span>
          ))}
        </div>
      </div>

      <div className="home-report-signal-edges">
        <div className="home-report-signal-density__top">
          <span>EDGE_GRID</span>
          <span>OPEN_FOR_DETAIL</span>
        </div>
        {comparisonPreview(view).map((row) => (
          <button
            type="button"
            key={row.category}
            className="home-report-signal-edge"
            onClick={() => onOpenComparison(row)}
            style={
              {
                "--edge-strength": `${marginStrength(row.margin)}%`,
              } as CSSProperties
            }
          >
            <span>{terminalLabel(row.category)}</span>
            <span>{formatSide(row.winner, view.fighters)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BattleResultPanel({
  playIntro,
  report,
}: BattleResultPanelProps) {
  const view = useMemo(() => normalizeReport(report), [report]);
  const [modal, setModal] = useState<ReportModalPayload | null>(null);

  function blockStyle(delayMs: number) {
    return {
      "--report-block-delay": `${CONTENT_INTRO_DELAY_MS + delayMs}ms`,
    } as CSSProperties;
  }

  function charDelay(text: string, index: number, delayMs: number) {
    const charCode = text.charCodeAt(index);
    const jitterSeed = charCode * 17 + index * 31 + text.length * 13;
    const jitterMs = (jitterSeed % 7) * 13;
    const spacePauseMs = text[index - 1] === " " ? 42 : 0;

    return (
      CONTENT_INTRO_DELAY_MS + delayMs + index * 108 + jitterMs + spacePauseMs
    );
  }

  function typedText(text: string, delayMs: number) {
    const chars = Array.from(text);

    return (
      <span className="home-battle-result-panel__typing" aria-label={text}>
        {chars.map((char, index) => {
          const isSpace = char === " ";

          return (
            <span
              key={`${char}-${index}`}
              aria-hidden="true"
              className="home-battle-result-panel__typing-char"
              data-char={isSpace ? "" : char}
              data-space={isSpace ? "true" : "false"}
              style={
                {
                  "--char-delay": `${charDelay(text, index, delayMs)}ms`,
                } as CSSProperties
              }
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <section
      className="home-battle-result-panel"
      data-intro={playIntro ? "play" : "static"}
      aria-label="Battle result"
    >
      <header className="relative z-10 flex flex-wrap items-start justify-between gap-4 border-b border-[#1a3a1a] pb-5">
        <div className="min-w-0">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em] text-[#68b768]">
            {typedText(view.headline.toUpperCase(), 180)}
          </p>
          <h2 className="mt-2 text-2xl font-bold uppercase leading-none tracking-[0.02em] text-white sm:text-4xl">
            {typedText(terminalLabel(view.verdictStamp), 300)}
          </h2>
          <p className="mt-3 max-w-[48rem] text-sm leading-6 text-[#d7e2d6]/72 sm:text-[0.95rem]">
            <span className="text-[#68b768]">&gt;</span> {view.subheadline}
          </p>
        </div>

        <div
          className="home-battle-result-panel__confidence border border-[#68b768]/60 bg-black/54 px-4 py-3 text-right shadow-[inset_0_0_18px_rgba(0,0,0,0.72)]"
          style={blockStyle(260)}
        >
          <p className="text-[0.54rem] font-semibold uppercase tracking-[0.18em] text-[#d7e2d6]/62">
            {typedText("CONFIDENCE", 420)}
          </p>
          <p className="mt-1 text-2xl font-black leading-none text-[#c9ffc8]">
            {view.confidence}%
          </p>
          <p className="mt-2 text-[0.54rem] uppercase tracking-[0.14em] text-[#d7e2d6]/48">
            data:{view.dataConfidence} / robust:{view.robustnessConfidence}
          </p>
        </div>
      </header>

      <div className="home-battle-result-panel__body relative z-10">
        <ReportSignalDeck
          view={view}
          style={blockStyle(320)}
          onOpenComparison={(row) => setModal(buildComparisonModal(row, view))}
        />

        <div className="home-report-terminal-grid">
          <div className="home-report-flow" style={blockStyle(420)}>
            <div className="home-report-panel-heading home-report-panel-heading--stacked">
              <span className="home-report-panel-heading__title">
                <span className="home-report-panel-heading__label">
                  BATTLE_SEQUENCE
                </span>
                <span className="home-report-panel-heading__terminal">
                  &gt; narrative.trace
                </span>
              </span>
              <span>{view.steps.length}_STAGES</span>
            </div>
            <p className="home-report-flow__hint">
              Scroll stages. Open a block for summary; proof stays locked.
            </p>

            <div className="home-report-flow__rail">
              {view.steps.map((step, index) => {
                const canInspect =
                  step.claims.length > 0 || step.chains.length > 0;

                return (
                  <div key={step.id} className="home-report-flow__node">
                    <button
                      type="button"
                      className="home-report-step-block"
                      data-contested={step.contested}
                      disabled={!canInspect}
                      onClick={() => setModal(buildStepModal(step, view))}
                    >
                      <span className="home-report-step-block__top">
                        <span>
                          &gt; STAGE_{String(step.step).padStart(2, "0")}
                        </span>
                        <span>{canInspect ? "LOCKED_DETAILS" : "LOG_ONLY"}</span>
                      </span>
                      <span className="home-report-step-block__title">
                        {terminalLabel(step.title)}
                      </span>
                      <span className="home-report-step-block__log">
                        {step.log}
                      </span>
                      <span className="home-report-step-block__meta">
                        <span>ALPHA_HP: {step.aHp ?? "N_A"}</span>
                        <span>OMEGA_HP: {step.bHp ?? "N_A"}</span>
                        <span>EVIDENCE: {step.claimIds.length}</span>
                        <span>LOGIC_LINKS: {step.chainIds.length}</span>
                      </span>
                    </button>

                    {index < view.steps.length - 1 ? (
                      <div className="home-report-flow-arrow" aria-hidden="true">
                        <span>&gt;</span>
                        <span>&gt;</span>
                        <span>&gt;</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="home-report-sidebar">
          <div
            className="home-battle-result-panel__section home-report-summary"
            style={blockStyle(450)}
          >
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#68b768]">
              {typedText("DECISION", 620)}
            </p>
            <p className="mt-3 text-3xl font-black uppercase leading-none text-white sm:text-4xl">
              {terminalLabel(view.winnerName)}
            </p>
            <div className="mt-4 grid gap-2 text-xs leading-5 text-[#d7e2d6]/76">
              <p>
                <span className="text-[#68b768]">&gt;</span> MATCH_DIFFICULTY:
                {" "}
                {view.difficulty}
              </p>
              <p>
                <span className="text-[#68b768]">&gt;</span> MAIN_REASON:
                {" "}
                {view.chainTeaser}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {view.tags.map((tag) => (
                <span key={tag} className="home-report-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {view.decisiveChain ? (
            <button
              type="button"
              className="home-battle-result-panel__section home-report-chain-callout"
              style={blockStyle(560)}
              onClick={() => setModal(buildChainModal(view.decisiveChain!, view))}
            >
              <span className="home-report-panel-heading">
                <span>&gt; KEY_ROUTE</span>
                <span>PROOF_LOCKED // {view.decisiveChain.confidence ?? "N_A"}%</span>
              </span>
              <span className="home-report-chain-callout__title">
                {terminalLabel(view.decisiveChain.title)}
              </span>
              <span className="home-report-chain-callout__text">
                {view.decisiveChain.conclusion}
              </span>
            </button>
          ) : null}

          <div
            className="home-battle-result-panel__section home-report-comparison"
            style={blockStyle(660)}
          >
            <div className="home-report-panel-heading">
              <span>&gt; CATEGORY_EDGES</span>
              <span>{view.comparison.length || "fallback"}</span>
            </div>
            <div className="mt-3 grid gap-2">
              {comparisonPreview(view).map((row) => (
                <button
                  type="button"
                  key={row.category}
                  className="home-report-comparison-row"
                  onClick={() => setModal(buildComparisonModal(row, view))}
                >
                  <span>{row.category}</span>
                  <span>{formatSide(row.winner, view.fighters)}</span>
                  <span>{row.margin ?? "N_A"}</span>
                </button>
              ))}
            </div>
          </div>
          </aside>
        </div>
      </div>

      {modal ? (
        <ReportDetailModal payload={modal} onClose={() => setModal(null)} />
      ) : null}
    </section>
  );
}

function ReportDetailModal({
  payload,
  onClose,
}: {
  payload: ReportModalPayload;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="home-report-modal-backdrop" onClick={onClose}>
      <section
        className="home-report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-report-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="home-report-modal__top">
          <div>
            <p className="home-report-modal__eyebrow">{payload.eyebrow}</p>
            <h3 id="home-report-modal-title">{payload.title}</h3>
          </div>
          <button
            type="button"
            className="home-report-modal__close"
            aria-label="Close report detail"
            onClick={onClose}
          >
            X
          </button>
        </div>

        <p className="home-report-modal__command">{payload.command}</p>
        <p className="home-report-modal__intro">{payload.intro}</p>

        <div className="home-report-modal__rows">
          {payload.metaRows.map(([label, value]) => (
            <p key={label}>
              <span>&gt; {label}</span>
              <span>{value}</span>
            </p>
          ))}
        </div>

        <ReportPaywall payload={payload} />
      </section>
    </div>
  );
}

function ReportModalItems({
  title,
  items,
}: {
  title: string;
  items: ModalItem[];
}) {
  return (
    <div className="home-report-modal__section home-report-paywall__detail-section">
      <p className="home-report-modal__section-title">&gt; {title}</p>
      {items.length ? (
        <div className="home-report-modal__items">
          {items.map((item) => (
            <article key={item.id} className="home-report-modal__item">
              <p className="home-report-modal__item-title">
                {terminalLabel(item.title)}
              </p>
              <p className="home-report-modal__item-meta">{item.meta}</p>
              <p className="home-report-modal__item-text">{item.text}</p>
              {item.lines?.length ? (
                <div className="home-report-modal__item-lines">
                  {item.lines.map((line) => (
                    <p key={line}>
                      <span>&gt;</span> {line}
                    </p>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="home-report-modal__empty">No linked rows in this node.</p>
      )}
    </div>
  );
}

function ReportPaywall({ payload }: { payload: ReportModalPayload }) {
  const [unlocked, setUnlocked] = useState(false);
  const preview = buildLockedPreview(payload);

  return (
    <div className="home-report-paywall" data-unlocked={unlocked}>
      <div className="home-report-paywall__scan" aria-hidden="true" />
      <div className="home-report-paywall__copy">
        <p className="home-report-paywall__eyebrow">&gt; full_report.locked</p>
        <h4>Unlock the proof layer</h4>
        <p>
          You can read the result, stage flow, HP trace, and main route here.
          The full report opens the exact premises, source references, claim
          text, and confidence audit.
        </p>
      </div>

      <div className="home-report-paywall__preview" aria-label="Locked detail preview">
        <p>
          <span>&gt; chains</span>
          <span>{preview.chains}</span>
        </p>
        <p>
          <span>&gt; claims</span>
          <span>{preview.claims}</span>
        </p>
        <p>
          <span>&gt; next_chain</span>
          <span>{preview.firstChainLabel}</span>
        </p>
        <p>
          <span>&gt; next_claim</span>
          <span>{preview.firstClaimLabel}</span>
        </p>
      </div>

      <button
        type="button"
        className="home-report-paywall__button"
        onClick={() => setUnlocked((current) => !current)}
      >
        {unlocked ? "HIDE_FULL_REPORT" : "UNLOCK_FULL_REPORT"}
      </button>

      {unlocked ? (
        <div className="home-report-paywall__details">
          <ReportModalItems title="ARGUMENT_CHAINS" items={payload.chains} />
          <ReportModalItems title="SOURCE_CLAIMS" items={payload.claims} />
        </div>
      ) : null}
    </div>
  );
}
