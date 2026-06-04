import type {
  ReportArgumentChain,
  ReportClaim,
  ReportComparisonRow,
  ReportFighter,
  ReportNarrativeStep,
} from "./types";

export const DEFAULT_FIGHTERS: ReportFighter[] = [
  { side: "A", name: "Contender Alpha" },
  { side: "B", name: "Contender Omega" },
];

export const DEFAULT_CLAIMS: ReportClaim[] = [
  {
    id: "recovery_claim_range",
    side: "B",
    category: "RANGE",
    text: "Omega can keep the exchange at a safer distance after the opening rush.",
    confidence: 72,
    source: {
      type: "UNKNOWN",
      ref: "ui://report/recovery",
      status: "REQUIRES_VERIFICATION",
    },
  },
  {
    id: "recovery_claim_pressure",
    side: "A",
    category: "WIN_CONDITION",
    text: "Alpha's clearest route is early pressure before Omega stabilizes spacing.",
    confidence: 67,
    contested: true,
    source: {
      type: "UNKNOWN",
      ref: "ui://report/recovery",
      status: "REQUIRES_VERIFICATION",
    },
  },
];

export const DEFAULT_CHAINS: ReportArgumentChain[] = [
  {
    id: "recovery_chain_decisive",
    side: "B",
    chain_type: "WIN_CONDITION",
    title: "Range Stabilization",
    conclusion:
      "Omega survives the opening exchange and converts range control into the final route.",
    premises: [
      {
        id: "recovery_premise_1",
        role: "FACT",
        claim_id: "recovery_claim_range",
        text: "Omega's safe distance improves after the first exchange.",
      },
      {
        id: "recovery_premise_2",
        role: "COUNTERPOINT",
        claim_id: "recovery_claim_pressure",
        text: "Alpha's pressure matters most before that distance is established.",
        contested: true,
      },
    ],
    inference:
      "If Alpha cannot finish early, Omega's spacing becomes decisive.",
    confidence: 70,
    breaks_if: "Alpha has a verified instant route that ignores range.",
    linked_claim_ids: ["recovery_claim_range", "recovery_claim_pressure"],
  },
];

export const DEFAULT_NARRATIVE: ReportNarrativeStep[] = [
  {
    step: 1,
    title: "Opening Probe",
    log: "Alpha pushes tempo and tests whether Omega can keep distance.",
    a_hp: 92,
    b_hp: 84,
    why: "The first exchange decides whether Alpha's pressure route is real.",
    claim_ids: ["recovery_claim_pressure"],
    chain_ids: ["recovery_chain_decisive"],
    contested: true,
  },
  {
    step: 2,
    title: "Spacing Lock",
    log: "Omega exits the pocket and forces Alpha to spend actions crossing range.",
    a_hp: 74,
    b_hp: 78,
    why: "Repeated entry attempts lower Alpha's clean-finish probability.",
    claim_ids: ["recovery_claim_range"],
    chain_ids: ["recovery_chain_decisive"],
  },
  {
    step: 3,
    title: "Counter Window",
    log: "Omega punishes the next approach instead of trading directly.",
    a_hp: 46,
    b_hp: 70,
    why: "The decisive chain starts once Omega can choose the exchange timing.",
    claim_ids: ["recovery_claim_range"],
    chain_ids: ["recovery_chain_decisive"],
  },
  {
    step: 4,
    title: "Route Collapse",
    log: "Alpha's early-win route loses reliability after the failed close.",
    a_hp: 21,
    b_hp: 62,
    why: "Alpha still threatens, but no longer controls the next action.",
    claim_ids: ["recovery_claim_pressure"],
    chain_ids: ["recovery_chain_decisive"],
    contested: true,
  },
  {
    step: 5,
    title: "Final Conversion",
    log: "Omega converts the safer route into a finishing hit.",
    a_hp: 0,
    b_hp: 58,
    why: "Range control plus failed pressure resolves the verdict.",
    claim_ids: ["recovery_claim_range", "recovery_claim_pressure"],
    chain_ids: ["recovery_chain_decisive"],
  },
];

export const DEFAULT_COMPARISON: ReportComparisonRow[] = [
  {
    category: "WIN_CONDITION",
    winner: "B",
    margin: "LARGE",
    reason: "Omega owns the more stable closing route.",
    claim_ids: ["recovery_claim_range"],
  },
  {
    category: "SKILL",
    winner: "A",
    margin: "SMALL",
    reason: "Alpha has the better opening tempo.",
    claim_ids: ["recovery_claim_pressure"],
    contested: true,
  },
];
