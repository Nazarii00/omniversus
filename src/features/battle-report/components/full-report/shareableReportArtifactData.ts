import {
  displayVerdict,
  formatSide,
  valueText,
  type BattleReportJson,
  type ReportArgumentChain,
  type ReportComparisonRow,
  type ReportFighter,
  type ReportViewModel,
} from "../../model";

type ReportWinCondition =
  NonNullable<BattleReportJson["win_conditions"]>[number];

export type ShareableReportActionsProps = {
  abilityInteractions?: BattleReportJson["ability_interactions"];
  comparison: ReportComparisonRow[];
  dataProvenance?: BattleReportJson["data_provenance"];
  decisiveChain: ReportArgumentChain | null;
  reportMetadata?: BattleReportJson["metadata"];
  reportRules?: BattleReportJson["rules"];
  summary: string;
  view: ReportViewModel;
  winConditions?: BattleReportJson["win_conditions"];
};

export type ArtifactSubject = {
  constraint: string;
  initials: string;
  name: string;
  origin: string;
  portraitDataUrl: string | null;
  profile: string;
  side: "A" | "B";
  tier: string;
};

export type ArtifactMetric = {
  assessment: string;
  countermeasure: string;
  contested: boolean;
  label: string;
  weight: string;
};

type ArtifactLog = {
  label: string;
  tone: "normal" | "danger" | "success";
  value: string;
};

export type ArtifactAssumption = {
  label: string;
  value: string;
};

export type ShareableArtifact = {
  assumptions: ArtifactAssumption[];
  classification: string;
  confidence: number;
  difficulty: string;
  docRef: string;
  logs: ArtifactLog[];
  metrics: ArtifactMetric[];
  outcome: string;
  reportId: string;
  summary: string;
  subjects: [ArtifactSubject, ArtifactSubject];
  title: string;
  winner: string;
  winnerSide: string | undefined;
};

export function buildShareableArtifact({
  abilityInteractions,
  comparison,
  dataProvenance,
  decisiveChain,
  reportMetadata,
  reportRules,
  summary,
  view,
  winConditions,
}: ShareableReportActionsProps): ShareableArtifact {
  const fighterA = view.fighters.find((fighter) => fighter.side === "A");
  const fighterB = view.fighters.find((fighter) => fighter.side === "B");
  const subjects: [ArtifactSubject, ArtifactSubject] = [
    buildSubject(fighterA, "A"),
    buildSubject(fighterB, "B"),
  ];
  const winnerLabel = formatSide(view.verdict.winner_side, view.fighters);
  const winner =
    view.verdict.winner_name ??
    view.winnerName ??
    winnerLabel ??
    "Undetermined";
  const decisiveWinCondition = pickWinCondition(
    winConditions,
    view.verdict.winner_side,
  );
  const opposingWinCondition = pickOpposingWinCondition(
    winConditions,
    view.verdict.winner_side,
  );
  const logs = [
    {
      label: "DECISIVE ROUTE",
      tone: "danger" as const,
      value:
        decisiveChain?.conclusion ??
        decisiveWinCondition?.method ??
        view.verdict.primary_reason ??
        view.chainTeaser,
    },
    {
      label: "FAILED COUNTER-ROUTE",
      tone: "success" as const,
      value:
        view.verdict.why_not_other_side ??
        view.verdict.loser_best_argument ??
        opposingWinCondition?.blocked_by,
    },
    {
      label: "REVERSAL CONDITION",
      tone: "normal" as const,
      value:
        view.verdict.flip_condition ??
        decisiveChain?.breaks_if ??
        decisiveWinCondition?.blocked_by,
    },
  ];

  return {
    assumptions: buildArtifactAssumptions({
      dataProvenance,
      reportMetadata,
      reportRules,
    }),
    classification: "PUBLIC REDACTION",
    confidence: view.confidence,
    difficulty: view.difficulty,
    docRef: docRef(view.id),
    logs: logs.map((log) => ({
      ...log,
      value: valueText(log.value),
    })),
    metrics: buildArtifactMetrics({
      abilityInteractions,
      comparison,
      decisiveChain,
      fighters: view.fighters,
      view,
    }),
    outcome:
      view.verdict.primary_reason ??
      decisiveChain?.conclusion ??
      decisiveWinCondition?.method ??
      view.chainTeaser,
    reportId: view.id,
    summary,
    subjects,
    title: "OMNIVERSUS CLASSIFIED DOSSIER",
    winner,
    winnerSide: view.verdict.winner_side,
  };
}

function buildSubject(
  fighter: ReportFighter | undefined,
  side: "A" | "B",
): ArtifactSubject {
  const name = fighter?.name ?? `Subject ${side}`;
  const origin = subjectOrigin(fighter);
  const profile = firstReadableText(
    fighter?.profile?.win_conditions?.[0],
    fighter?.best_argument,
    fighter?.profile?.abilities,
    fighter?.tier?.basis,
  );
  const constraint = firstReadableText(
    fighter?.profile?.weaknesses?.[0],
    fighter?.weakest_argument,
    fighter?.profile?.lose_conditions?.[0],
    fighter?.tier?.basis,
  );

  return {
    constraint: valueText(constraint),
    initials: initialsFor(name || side),
    name,
    origin: valueText(origin),
    portraitDataUrl: fighter?.portrait?.data_url ?? null,
    profile: valueText(profile),
    side,
    tier: valueText(fighter?.tier?.rating),
  };
}

function buildArtifactMetrics({
  abilityInteractions,
  comparison,
  decisiveChain,
  fighters,
  view,
}: {
  abilityInteractions?: BattleReportJson["ability_interactions"];
  comparison: ReportComparisonRow[];
  decisiveChain: ReportArgumentChain | null;
  fighters: ReportFighter[];
  view: ReportViewModel;
}): ArtifactMetric[] {
  if (abilityInteractions?.length) {
    return abilityInteractions.slice(0, 4).map((interaction) => {
      const attacker = subjectSideLabel(interaction.attacker, fighters);
      const defender = subjectSideLabel(interaction.defender, fighters);
      const route = displayVerdict(interaction.ability_type ?? "ABILITY");
      const effective = displayVerdict(interaction.effective ?? "FILED");
      const assessment = firstReadableText(
        interaction.reason,
        interaction.relevance_to_win_condition,
        interaction.activation,
      );
      const countermeasure = firstReadableText(
        interaction.defender_resistance,
        interaction.counterplay,
        interaction.resistance_basis,
        interaction.structurally_similar_resistance,
      );

      return {
        assessment: `${effective}: ${valueText(assessment)}`,
        contested: Boolean(interaction.contested),
        countermeasure: valueText(countermeasure),
        label: `${attacker}->${defender} ${route}`,
        weight: interaction.contested
          ? `DISPUTED / ${displayVerdict(interaction.impact ?? "FILED")}`
          : displayVerdict(interaction.impact ?? "FILED"),
      };
    });
  }

  const fallbackRows: ReportComparisonRow[] = [
    {
      category: "WIN_CONDITION",
      reason:
        decisiveChain?.conclusion ??
        view.verdict.primary_reason ??
        view.chainTeaser,
      winner: view.verdict.winner_side,
      margin: "DECISIVE",
      contested: Boolean(decisiveChain?.contested),
    },
    {
      category: "RESISTANCE",
      reason:
        view.verdict.why_not_other_side ??
        view.verdict.loser_best_argument ??
        "Opposing route remains filed for manual review.",
      winner: view.verdict.winner_side,
      margin: "MEDIUM",
      contested: Boolean(decisiveChain?.contested),
    },
    {
      category: "CONSENSUS",
      reason:
        view.verdict.flip_condition ??
        decisiveChain?.breaks_if ??
        "Result changes if the decisive route is invalidated.",
      winner: "TIE",
      margin: "SMALL",
      contested: true,
    },
  ];
  const sourceRows = comparison.length ? comparison : fallbackRows;

  return sourceRows.slice(0, 4).map((row) => {
    const winner =
      row.winner === "A" || row.winner === "B"
        ? subjectSideLabel(row.winner, fighters)
        : displayVerdict(row.winner ?? "TIE");
    const margin = valueText(row.margin);

    return {
      assessment:
        margin === "N/A"
          ? winner
          : `${winner} / ${displayVerdict(margin)}`,
      contested: Boolean(row.contested),
      countermeasure: valueText(row.reason),
      label: displayVerdict(row.category),
      weight: row.contested
        ? `CONTESTED / ${displayVerdict(margin === "N/A" ? "FILED" : margin)}`
        : displayVerdict(margin === "N/A" ? "FILED" : margin),
    };
  });
}

function buildArtifactAssumptions({
  dataProvenance,
  reportMetadata,
  reportRules,
}: Pick<
  ShareableReportActionsProps,
  "dataProvenance" | "reportMetadata" | "reportRules"
>): ArtifactAssumption[] {
  const canonScope = joinReadable(
    [
      reportMetadata?.battle_type,
      reportMetadata?.canon_scope,
      reportRules?.assumption_set,
    ],
    " / ",
  );
  const arenaRules = joinReadable(
    [
      reportRules?.location ? `Location: ${reportRules.location}` : null,
      reportRules?.starting_distance
        ? `Distance: ${reportRules.starting_distance}`
        : null,
      reportRules?.equipment ? `Equipment: ${reportRules.equipment}` : null,
    ],
    "; ",
  );
  const prepRules = joinReadable(
    [
      reportRules?.prep_time ? `Prep: ${reportRules.prep_time}` : null,
      reportRules?.prior_knowledge
        ? `Prior knowledge: ${reportRules.prior_knowledge}`
        : null,
      reportRules?.verse_equalization
        ? `Verse equalization: ${reportRules.verse_equalization}`
        : null,
    ],
    "; ",
  );
  const provenance = joinReadable(
    [
      dataProvenance?.mode,
      dataProvenance?.summary,
      dataProvenance?.needs_manual_review ? "manual review flagged" : null,
    ],
    " - ",
  );

  return [
    {
      label: "Filed rules baseline",
      value: firstReadableText(
        reportMetadata?.assumptions,
        reportRules?.rule_notes,
        "Standard battle assumptions unless the arena file overrides them.",
      ),
    },
    {
      label: "Canon and battle type",
      value: firstReadableText(canonScope, "Objective combat file."),
    },
    {
      label: "Arena conditions",
      value: firstReadableText(arenaRules, "No special arena condition filed."),
    },
    {
      label: "Prep and knowledge",
      value: firstReadableText(prepRules, "No prep or prior knowledge filed."),
    },
    {
      label: "Speed handling",
      value: speedAssumption(
        reportMetadata?.speed_equalized ?? reportRules?.speed_equalized,
      ),
    },
    {
      label: "Data status",
      value: firstReadableText(
        provenance,
        "Session verdict loaded from arena result.",
      ),
    },
  ];
}

function pickWinCondition(
  winConditions: BattleReportJson["win_conditions"],
  side: string | undefined,
): ReportWinCondition | undefined {
  const normalizedSide = side?.toUpperCase();

  if (normalizedSide === "A" || normalizedSide === "B") {
    return winConditions?.find((condition) => condition.side === normalizedSide);
  }

  return winConditions?.[0];
}

function pickOpposingWinCondition(
  winConditions: BattleReportJson["win_conditions"],
  winnerSide: string | undefined,
): ReportWinCondition | undefined {
  const normalizedSide = winnerSide?.toUpperCase();

  if (normalizedSide !== "A" && normalizedSide !== "B") {
    return winConditions?.[1] ?? winConditions?.[0];
  }

  return winConditions?.find((condition) => condition.side !== normalizedSide);
}

function subjectOrigin(fighter: ReportFighter | undefined) {
  const fullTitle = firstReadableText(
    fighter?.origin?.full_title,
    fighter?.verse,
    fighter?.origin?.abbreviation,
  );
  const continuity = firstReadableText(fighter?.origin?.continuity);

  if (fullTitle !== "N/A" && continuity !== "N/A" && continuity !== fullTitle) {
    return `${fullTitle} (${continuity})`;
  }

  return fullTitle;
}

function subjectSideLabel(side: string | undefined, fighters: ReportFighter[]) {
  if (side !== "A" && side !== "B") return displayVerdict(side ?? "SYSTEM");

  const fighter = fighters.find((item) => item.side === side);

  return fighter ? `SUBJ ${side}` : `SUBJ ${side}`;
}

function joinReadable(values: unknown[], separator: string) {
  const parts = values
    .map((value) => firstReadableText(value))
    .filter((value) => value !== "N/A");

  return parts.length ? parts.join(separator) : "N/A";
}

function firstReadableText(...values: unknown[]) {
  for (const value of values) {
    const text = valueText(value).replace(/\s+/g, " ").trim();

    if (!text || text === "N/A" || /^unknown$/i.test(text)) continue;

    return text;
  }

  return "N/A";
}

function speedAssumption(speedEqualized: boolean | undefined) {
  if (speedEqualized === true) {
    return "Speed is equalized; timing still matters for activation, range, and win-route access.";
  }

  if (speedEqualized === false) {
    return "Speed is not equalized; initiative, activation timing, and travel time remain live factors.";
  }

  return "Speed policy not filed; route timing should be treated as provisional.";
}

function docRef(reportId: string) {
  return reportId
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(-8)
    .padStart(8, "0");
}

function initialsFor(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "??"
  );
}
