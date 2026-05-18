"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  BattleResultPanel,
  clearLatestBattleReport,
  MOCK_BATTLE_REPORT,
  writeLatestBattleReport,
  type BattleReportJson,
} from "@/features/battle-report";

import { arenaCards, combatantAutocompleteOptions } from "../../data";
import { makeCombatantCard } from "../../logic";
import type { ArenaCard, ArenaCardSide } from "../../model";
import { ArenaVersusMark } from "../arena";
import { BattleControls, BattleReportButton } from "../battle-controls";
import { ArenaBetSelector } from "../betting";
import { CombatantDeck } from "../combatant-deck";
import {
  CombatantEntrySlot,
  CombatantLoadoutConsole,
} from "../combatant-entry";
import { useBattleTimeline, useStoredHomeArenaState } from "./hooks";
import { clearStoredHomeArenaState, writeStoredHomeArenaState } from "./state";

export default function HomeArenaStage() {
  const [leftTemplate, rightTemplate] = arenaCards;
  const { storedArenaState, storedArenaStateText } = useStoredHomeArenaState();
  const storedLeftName =
    typeof storedArenaState?.leftName === "string"
      ? storedArenaState.leftName
      : null;
  const storedRightName =
    typeof storedArenaState?.rightName === "string"
      ? storedArenaState.rightName
      : null;
  const storedBattleReport = storedArenaState?.battleReport ?? null;
  const restoredLeftCard = useMemo(
    () =>
      storedLeftName ? makeCombatantCard(leftTemplate, storedLeftName) : null,
    [leftTemplate, storedLeftName],
  );
  const restoredRightCard = useMemo(
    () =>
      storedRightName
        ? makeCombatantCard(rightTemplate, storedRightName)
        : null,
    [rightTemplate, storedRightName],
  );
  const [leftCardState, setLeftCard] = useState<ArenaCard | null | undefined>();
  const [rightCardState, setRightCard] = useState<
    ArenaCard | null | undefined
  >();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReportReadyState, setIsReportReady] = useState<
    boolean | undefined
  >();
  const [battleReportState, setBattleReport] = useState<
    BattleReportJson | null | undefined
  >();
  const [reportSerialState] = useState<number | undefined>();
  const [isLoadoutConsoleOpen, setIsLoadoutConsoleOpen] = useState(false);
  const [loadoutFocusSide, setLoadoutFocusSide] =
    useState<ArenaCardSide>("left");
  const hasRunPersistenceEffect = useRef(false);
  const {
    battleEliminatedSide,
    battleGlitchResetToken,
    battleShockCue,
    battleSkipToken,
    isBattleTimelineActive,
    leftCrtImpact,
    resetBattleTimeline,
    rightCrtImpact,
    skipBattleTimeline,
    startBattleTimeline,
  } = useBattleTimeline();
  const leftCard =
    leftCardState === undefined ? restoredLeftCard : leftCardState;
  const rightCard =
    rightCardState === undefined ? restoredRightCard : rightCardState;
  const battleReport =
    battleReportState === undefined ? storedBattleReport : battleReportState;
  const isReportReady =
    isReportReadyState ??
    Boolean(storedArenaState?.isReportReady && storedBattleReport);
  const reportSerial = reportSerialState ?? storedArenaState?.reportSerial ?? 0;
  useEffect(() => {
    if (!hasRunPersistenceEffect.current) {
      hasRunPersistenceEffect.current = true;

      if (!storedArenaStateText) return;
    }

    const readyReport = isReportReady ? battleReport : null;

    writeStoredHomeArenaState({
      leftName: leftCard?.name,
      rightName: rightCard?.name,
      battleReport: readyReport,
      isReportReady: Boolean(readyReport),
      reportSerial,
    });

    if (readyReport) {
      writeLatestBattleReport(readyReport);
    }
  }, [
    battleReport,
    isReportReady,
    leftCard?.name,
    reportSerial,
    rightCard?.name,
    storedArenaStateText,
  ]);

  function openReport() {
    console.log("[BATTLE_UI] full report", battleReport ?? MOCK_BATTLE_REPORT);
    setIsReportOpen(true);
  }

  function openLoadoutConsole(side: ArenaCardSide) {
    setLoadoutFocusSide(side);
    setIsLoadoutConsoleOpen(true);
  }

  function resetBattleState() {
    setIsReportOpen(false);
    setIsReportReady(false);
    setBattleReport(null);
    resetBattleTimeline();
    clearLatestBattleReport();
  }

  function handleBattleStart() {
    setIsReportOpen(false);
    setIsReportReady(false);
    setBattleReport(null);
    clearLatestBattleReport();

    return startBattleTimeline(battleReport);
  }

  function resetSelection() {
    setLeftCard(null);
    setRightCard(null);
    setIsLoadoutConsoleOpen(false);
    clearStoredHomeArenaState();
    resetBattleState();
  }

  function loadCombatants({ left, right }: Record<ArenaCardSide, string>) {
    setLeftCard(makeCombatantCard(leftTemplate, left));
    setRightCard(makeCombatantCard(rightTemplate, right));
    setIsLoadoutConsoleOpen(false);
    resetBattleState();
  }

  return (
    <section
      className="home-arena-stage h-[100dvh] min-h-[100svh] overflow-hidden px-5 py-[3.5vh] sm:px-8 sm:py-[4vh]"
      data-view={isReportOpen ? "report" : "setup"}
    >
      {battleShockCue ? (
        <span
          key={`${battleShockCue.runId}-${battleShockCue.act}`}
          aria-hidden="true"
          className="home-battle-impact"
          data-act={battleShockCue.act}
        >
          <span className="home-battle-impact__pressure" />
          <span className="home-battle-impact__edge" />
          <span className="home-battle-impact__shock" />
        </span>
      ) : null}

      {isBattleTimelineActive && !isReportOpen ? (
        <button
          type="button"
          className="home-battle-skip"
          onClick={skipBattleTimeline}
        >
          SKIP_SIM
        </button>
      ) : null}

      {(isReportReady || leftCard || rightCard) && !isReportOpen ? (
        <div
          className="home-arena-top-actions"
          aria-label="Arena quick actions"
        >
          {isReportReady ? (
            <BattleReportButton key={reportSerial} onViewReport={openReport} />
          ) : null}
          {leftCard || rightCard ? (
            <BattleReportButton
              ariaLabel="Reset selected combatants"
              label="RESET_SELECTION"
              onViewReport={resetSelection}
            />
          ) : null}
        </div>
      ) : null}

      <div className="home-arena-flow mx-auto flex h-full w-full max-w-[72rem] flex-col items-center justify-center">
        <div className="home-arena-combat-zone w-full">
          <div className="home-arena-setup-grid grid w-full grid-cols-1 justify-items-center gap-7 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)] sm:items-center sm:gap-10 md:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] md:gap-12">
            <div className="sm:justify-self-end">
              <CombatantEntrySlot
                card={leftCard}
                crtImpact={leftCrtImpact}
                crtResetToken={battleGlitchResetToken}
                isEliminated={battleEliminatedSide === "left"}
                template={leftTemplate}
                label="ALPHA_SLOT"
                onOpenConsole={() => openLoadoutConsole("left")}
              />
            </div>

            <ArenaVersusMark />

            <div className="sm:justify-self-start">
              <CombatantEntrySlot
                card={rightCard}
                crtImpact={rightCrtImpact}
                crtResetToken={battleGlitchResetToken}
                isEliminated={battleEliminatedSide === "right"}
                template={rightTemplate}
                label="OMEGA_SLOT"
                onOpenConsole={() => openLoadoutConsole("right")}
              />
            </div>
          </div>

          {isLoadoutConsoleOpen && !isReportOpen ? (
            <CombatantLoadoutConsole
              initialFocusSide={loadoutFocusSide}
              initialLeftName={leftCard?.name}
              initialRightName={rightCard?.name}
              options={combatantAutocompleteOptions}
              onClose={() => setIsLoadoutConsoleOpen(false)}
              onSubmit={loadCombatants}
            />
          ) : null}

          {isReportOpen && leftCard && rightCard ? (
            <div className="home-arena-report-layout">
              <CombatantDeck
                cards={[leftCard, rightCard]}
                onReturn={() => setIsReportOpen(false)}
              />
              <BattleResultPanel
                playIntro
                report={battleReport ?? MOCK_BATTLE_REPORT}
              />
            </div>
          ) : null}
        </div>

        <div className="home-arena-controls flex w-full flex-col items-center">
          {leftCard && rightCard ? (
            <ArenaBetSelector leftCard={leftCard} rightCard={rightCard} />
          ) : (
            <p className="mb-3 text-center text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[#d7e2d6]/62">
              LOAD_TWO_COMBATANTS_TO_ENABLE_BATTLE
            </p>
          )}
          <BattleControls
            key={battleSkipToken}
            fighterA={leftCard?.name ?? null}
            fighterB={rightCard?.name ?? null}
            onBattleStart={handleBattleStart}
          />
        </div>
      </div>
    </section>
  );
}
