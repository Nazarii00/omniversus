"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import { MOCK_BATTLE_REPORT } from "../../data";
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
import styles from "./FullBattleReportPage.module.css";

export default function FullBattleReportPage() {
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
  const hasStoredReport = Boolean(storedReport);
  const report: BattleReportJson = storedReport ?? MOCK_BATTLE_REPORT;
  const view = useMemo(() => normalizeReport(report), [report]);

  const fighters = view.fighters;
  const fighterA = fighters.find((fighter) => fighter.side === "A");
  const fighterB = fighters.find((fighter) => fighter.side === "B");
  const chains = useMemo(() => Array.from(view.chainsById.values()), [view]);
  const claims = useMemo(() => Array.from(view.claimsById.values()), [view]);
  const comparison = view.comparison.length
    ? view.comparison
    : comparisonPreview(view);
  const decisiveChain =
    view.decisiveChain ??
    chains.find((chain) => chain.chain_type === "WIN_CONDITION") ??
    chains[0] ??
    null;
  const keyFactors = view.verdict.key_factors?.length
    ? view.verdict.key_factors
    : view.tags;
  const filedFindings = buildFindingRecords(
    keyFactors,
    comparison,
    decisiveChain,
    view.verdict.primary_reason ?? view.chainTeaser,
  );
  const warnings = qualityWarnings(report);
  const winnerLabel = formatSide(view.verdict.winner_side, fighters);
  const winnerName = view.verdict.winner_name ?? view.winnerName ?? winnerLabel;
  const heroSummary =
    view.verdict.summary_3_sentences ??
    view.verdict.primary_reason ??
    view.chainTeaser;

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
          status={hasStoredReport ? "SESSION FILED" : "ARCHIVE SAMPLE"}
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
            <ShareableReportActions
              abilityInteractions={report.ability_interactions}
              comparison={comparison}
              dataProvenance={report.data_provenance}
              decisiveChain={decisiveChain}
              hasStoredReport={hasStoredReport}
              reportMetadata={report.metadata}
              reportRules={report.rules}
              summary={heroSummary}
              view={view}
              winConditions={report.win_conditions}
            />
          }
        />

        <SectionTabs />

        <div className={styles.terminalBody}>
          <div className={styles.mainFile}>
            {!hasStoredReport ? (
              <section className={styles.noticePanel}>
                <b>NO LIVE VERDICT FILE FOUND</b>
                <span>
                  Archive sample loaded under quarantine. Open a battle result
                  from the arena to replace this dossier with session evidence.
                </span>
              </section>
            ) : null}

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
          </div>
        </div>
      </div>
    </main>
  );
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
