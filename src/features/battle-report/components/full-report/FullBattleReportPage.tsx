"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  buildFindingRecords,
  boolText,
  comparisonPreview,
  formatSide,
  LATEST_BATTLE_REPORT_STORAGE_EVENT,
  normalizeReport,
  parseLatestBattleReport,
  qualityWarnings,
  readLatestBattleReportText,
  type BattleReportJson,
} from "../../model";
import {
  ArgumentTimeline,
  BattleProgression,
  ClaimsDeck,
  ReportHero,
  SectionTabs,
  ShareableReportActions,
  SubjectFaceoff,
  VerdictBrief,
  VerdictStack,
} from "./FullBattleReportSections";
import { QualityBadge, VerdictFeedback } from "./VerdictFeedback";
import styles from "../../styles/FullBattleReportPage.module.css";

type ReportPortrait = NonNullable<
  NonNullable<BattleReportJson["fighters"]>[number]["portrait"]
>;

type PortraitHydrationResponse = {
  portraits?: Partial<Record<"A" | "B", ReportPortrait>>;
};

export default function FullBattleReportPage() {
  const [hydratedReport, setHydratedReport] = useState<{
    report: BattleReportJson;
    storageKey: string | null;
  } | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("battle-report-scroll-unlocked");
    document.body.classList.add("battle-report-scroll-unlocked");

    return () => {
      document.documentElement.classList.remove(
        "battle-report-scroll-unlocked",
      );
      document.body.classList.remove("battle-report-scroll-unlocked");
    };
  }, []);

  const storedReportText = useSyncExternalStore(
    subscribeToReportStorage,
    readLatestBattleReportText,
    () => null,
  );
  const storedReport = useMemo(
    () => parseLatestBattleReport(storedReportText),
    [storedReportText],
  );
  const report =
    hydratedReport?.storageKey === storedReportText
      ? hydratedReport.report
      : storedReport;
  const view = useMemo(
    () => (report ? normalizeReport(report) : null),
    [report],
  );

  useEffect(() => {
    if (!storedReport || !needsPortraitHydration(storedReport)) return;

    let isCancelled = false;

    void fetch("/api/battle-report/portraits", {
      body: JSON.stringify({
        fighters: storedReport.fighters?.map((fighter) => ({
          name: fighter.name,
          side: fighter.side,
        })),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<PortraitHydrationResponse>)
          : null,
      )
      .then((payload) => {
        if (isCancelled || !payload?.portraits) return;

        const nextReport = reportWithHydratedPortraits(
          storedReport,
          payload.portraits,
        );

        if (nextReport !== storedReport) {
          setHydratedReport({
            report: nextReport,
            storageKey: storedReportText,
          });
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [storedReport, storedReportText]);

  const fighters = view?.fighters ?? [];
  const fighterA = fighters.find((fighter) => fighter.side === "A");
  const fighterB = fighters.find((fighter) => fighter.side === "B");
  const chains = useMemo(
    () => (view ? Array.from(view.chainsById.values()) : []),
    [view],
  );
  const claims = useMemo(
    () => (view ? Array.from(view.claimsById.values()) : []),
    [view],
  );
  const comparison = view?.comparison.length
    ? view.comparison
    : view
      ? comparisonPreview(view)
      : [];
  const decisiveChain =
    view?.decisiveChain ??
    chains.find((chain) => chain.chain_type === "WIN_CONDITION") ??
    chains[0] ??
    null;
  const keyFactors = view?.verdict.key_factors?.length
    ? view.verdict.key_factors
    : (view?.tags ?? []);
  const filedFindings = view
    ? buildFindingRecords(
        keyFactors,
        comparison,
        decisiveChain,
        view.verdict.primary_reason ?? view.chainTeaser,
      )
    : [];
  const warnings = report ? qualityWarnings(report) : [];
  const winnerLabel = view
    ? formatSide(view.verdict.winner_side, fighters)
    : "";
  const winnerName =
    view?.verdict.winner_name ?? view?.winnerName ?? winnerLabel;
  const heroSummary =
    view?.verdict.summary_3_sentences ??
    view?.verdict.primary_reason ??
    view?.chainTeaser ??
    "";

  const qualityScore = report?.quality_score ?? null;
  const qualityBand = report?.quality_band ?? null;
  const battleRunId = report?.battle_run_id ?? null;

  if (!report || !view) {
    return (
      <main className={styles.reportScreen}>
        <div className={styles.screenTexture} aria-hidden="true" />
        <div className={styles.pageShell}>
          <section className={styles.noticePanel}>
            <b>NO LIVE VERDICT FILE FOUND</b>
            <span>
              Start a battle from the arena to generate a session report.
            </span>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.reportScreen}>
      <div className={styles.screenTexture} aria-hidden="true" />
      <div className={styles.pageShell}>
        <ReportHero
          title={view.title}
          summary={heroSummary}
          winner={winnerName}
          difficulty={view.difficulty}
          confidence={view.confidence}
          status="SESSION FILED"
          caseId={view.id}
          tags={[
            `CASE TYPE: ${report.metadata?.battle_type ?? "OBJECTIVE"}`,
            `CANON SCOPE: ${report.metadata?.canon_scope ?? "N/A"}`,
            `SPEED EQUALIZED: ${boolText(report.metadata?.speed_equalized)}`,
            ...(report.metadata?.assumptions
              ? [`ASSUMPTION: ${report.metadata.assumptions}`]
              : []),
          ]}
          actions={
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <QualityBadge score={qualityScore} band={qualityBand} />
              <ShareableReportActions
                abilityInteractions={report.ability_interactions}
                comparison={comparison}
                dataProvenance={report.data_provenance}
                decisiveChain={decisiveChain}
                reportMetadata={report.metadata}
                reportRules={report.rules}
                summary={heroSummary}
                view={view}
                winConditions={report.win_conditions}
              />
            </div>
          }
        />

        <SectionTabs />

        <div className={styles.terminalBody}>
          <div className={styles.mainFile}>
            <SubjectFaceoff
              fighterA={fighterA}
              fighterB={fighterB}
              chains={chains}
              comparison={comparison}
              verdict={view.verdict}
            />

            <VerdictBrief
              primaryReason={view.verdict.primary_reason ?? view.chainTeaser}
              findings={filedFindings}
              loserBestArgument={view.verdict.loser_best_argument}
              whyNotOtherSide={view.verdict.why_not_other_side}
              flipCondition={view.verdict.flip_condition}
            />

            <section
              className={styles.analysisGrid}
              aria-label="Argument and verdict analysis"
            >
              <ArgumentTimeline
                chains={chains}
                decisiveChain={decisiveChain}
                fighters={fighters}
                reportId={view.id}
                reportTitle={view.title}
              />
            </section>

            <VerdictStack
              confidence={view.confidence}
              dataConfidence={view.dataConfidence}
              robustnessConfidence={view.robustnessConfidence}
              givenDataConfidence={
                report.verdict?.verdict_confidence_given_data_score
              }
              confidenceExplanation={view.verdict.confidence_explanation}
              warnings={warnings}
              fighters={fighters}
              comparison={comparison}
            />

            <ClaimsDeck
              claims={claims}
              fighters={fighters}
              reportId={view.id}
              reportTitle={view.title}
            />

            <BattleProgression view={view} />

            {battleRunId && (
              <VerdictFeedback variant="full" battleRunId={battleRunId} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function needsPortraitHydration(report: BattleReportJson) {
  return Boolean(
    report.fighters?.some(
      (fighter) =>
        (fighter.side === "A" || fighter.side === "B") &&
        fighter.name &&
        !fighter.portrait?.data_url,
    ),
  );
}

function reportWithHydratedPortraits(
  report: BattleReportJson,
  portraits: PortraitHydrationResponse["portraits"],
) {
  if (!report.fighters?.length || !portraits) return report;

  let didHydrate = false;
  const fighters = report.fighters.map((fighter) => {
    if (fighter.portrait?.data_url) return fighter;
    if (fighter.side !== "A" && fighter.side !== "B") return fighter;

    const portrait = portraits[fighter.side];
    if (!portrait?.data_url) return fighter;

    didHydrate = true;
    return { ...fighter, portrait };
  });

  return didHydrate ? { ...report, fighters } : report;
}

function subscribeToReportStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(LATEST_BATTLE_REPORT_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(
      LATEST_BATTLE_REPORT_STORAGE_EVENT,
      onStoreChange,
    );
  };
}
