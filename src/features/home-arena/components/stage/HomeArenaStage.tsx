"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BattleResultPanel,
  checkBattleCache,
  clearLatestBattleReport,
  requestBattleReport,
  requestBattleReportDev,
  writeLatestBattleReport,
  type BattleReportJson,
} from "@/features/battle-report";
import { VerdictFeedback } from "@/features/battle-report/components/full-report/VerdictFeedback";

import { arenaCards } from "../../data";
import {
  BATTLE_CREDIT_COST,
  CREDIT_TOP_UP_AMOUNT,
  DEFAULT_ARENA_BET,
  applyArenaBetSettlement,
  eliminatedCardSideForReport,
  findExactCombatantOption,
  lockArenaBet,
  makeCombatantCard,
  parseArenaBetAmount,
  readStoredArenaWallet,
  refundArenaLockedBet,
  settleArenaBet,
  topUpArenaWallet,
  writeStoredArenaWallet,
} from "../../logic";
import type {
  ArenaBetDraft,
  ArenaCard,
  ArenaCardSide,
  ArenaWallet,
  CombatantOption,
} from "../../model";
import { ArenaVersusMark } from "../arena";
import {
  BattleControls,
  BattleLoadingConsole,
  BattleReportButton,
} from "../battle-controls";
import "../../styles/coin-flight.css";
import {
  ArenaBalancePanel,
  ArenaBetSelector,
  CoinFlightAnimation,
} from "../betting";
import { CombatantDeck } from "../combatant-deck";
import {
  CombatantEntrySlot,
  CombatantLoadoutConsole,
} from "../combatant-entry";
import {
  useBattleTimeline,
  useDevMode,
  usePageVisibility,
  useStoredHomeArenaState,
} from "./hooks";
import { clearStoredHomeArenaState, writeStoredHomeArenaState } from "./state";

type HomeArenaStageProps = {
  combatantOptions?: CombatantOption[];
};

const EMPTY_COMBATANT_OPTIONS: CombatantOption[] = [];
const BATTLE_LOADING_CONSOLE_DELAY_MS = 520;

export default function HomeArenaStage({
  combatantOptions,
}: HomeArenaStageProps = {}) {
  const [leftTemplate, rightTemplate] = arenaCards;
  const arenaCombatantOptions = combatantOptions ?? EMPTY_COMBATANT_OPTIONS;
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
      storedLeftName
        ? makeCombatantCard(
            leftTemplate,
            storedLeftName,
            findExactCombatantOption(arenaCombatantOptions, storedLeftName),
          )
        : null,
    [arenaCombatantOptions, leftTemplate, storedLeftName],
  );
  const restoredRightCard = useMemo(
    () =>
      storedRightName
        ? makeCombatantCard(
            rightTemplate,
            storedRightName,
            findExactCombatantOption(arenaCombatantOptions, storedRightName),
          )
        : null,
    [arenaCombatantOptions, rightTemplate, storedRightName],
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
  const [reportSerialState, setReportSerial] = useState<number | undefined>();
  const [battleError, setBattleError] = useState("");
  const [isBattleRequestActive, setIsBattleRequestActive] = useState(false);
  const [isBattleLoadingConsoleVisible, setIsBattleLoadingConsoleVisible] =
    useState(false);
  const [isLoadoutConsoleOpen, setIsLoadoutConsoleOpen] = useState(false);
  const [loadoutFocusSide, setLoadoutFocusSide] =
    useState<ArenaCardSide>("left");
  const [arenaWallet, setArenaWallet] = useState<ArenaWallet>(
    readStoredArenaWallet,
  );
  const [arenaBet, setArenaBet] = useState<ArenaBetDraft>(DEFAULT_ARENA_BET);
  const [bettingStatus, setBettingStatus] = useState("BETTING_READY");
  const [coinFlight, setCoinFlight] = useState<{
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    amount: number;
  } | null>(null);
  const [isBattleCached, setIsBattleCached] = useState(false);
  const [cachedBattleRunId, setCachedBattleRunId] = useState<string | null>(
    null,
  );
  const cacheCheckRef = useRef(0);
  const router = useRouter();
  const hasRunPersistenceEffect = useRef(false);
  const { isPageVisible } = usePageVisibility();
  const {
    battleEliminatedSide,
    battleGlitchResetToken,
    battleShockCue,
    isBattleOpenerActive,
    isBattleTimelineActive,
    leftCrtImpact,
    resetBattleTimeline,
    rightCrtImpact,
    skipBattleTimeline,
    startBattleTimeline,
  } = useBattleTimeline();
  const { isAdmin, isDevMode, toggleDevMode } = useDevMode();

  // Sync arena wallet from server profile on mount
  useEffect(() => {
    let cancelled = false;

    fetch("/api/profile/wallet")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load profile wallet");
        return res.json();
      })
      .then((data: { credits: number; reputation: number }) => {
        if (cancelled) return;
        setArenaWallet((current) => {
          // Only update if server values differ from current
          if (
            data.credits === current.credits &&
            data.reputation === current.reputation
          )
            return current;
          return { credits: data.credits, reputation: data.reputation };
        });
      })
      .catch(() => {
        // Fall back to localStorage wallet silently
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- One-time profile wallet sync on mount.
  }, []);

  // Sync wallet to server after settlement changes
  const syncArenaWalletToServer = useCallback((wallet: ArenaWallet) => {
    fetch("/api/profile/wallet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credits: wallet.credits,
        reputation: wallet.reputation,
      }),
    }).catch(() => {
      // Silent fail — localStorage is the source of truth
    });
  }, []);

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
  const persistedEliminatedSide = useMemo(
    () => (isReportReady ? eliminatedCardSideForReport(battleReport) : null),
    [battleReport, isReportReady],
  );
  const displayedEliminatedSide =
    battleEliminatedSide ?? persistedEliminatedSide;
  const battleImpactPhase = battleShockCue
    ? battleShockCue.act % 2 === 0
      ? "even"
      : "odd"
    : undefined;
  const isBattleSequenceActive =
    (isBattleRequestActive || isBattleTimelineActive) && !isReportOpen;
  const isBattleLoadingVisible = isBattleLoadingConsoleVisible && !isReportOpen;
  const isArenaLocked = isBattleRequestActive || isBattleTimelineActive;
  const betAmount = parseArenaBetAmount(arenaBet.amountText);
  const hasSelectedCombatants = Boolean(leftCard?.name && rightCard?.name);
  const hasBattleCredit = arenaWallet.credits >= BATTLE_CREDIT_COST;
  const hasBetReputation = betAmount <= arenaWallet.reputation;
  const canExecuteBattle =
    hasSelectedCombatants && hasBattleCredit && hasBetReputation;
  const battleDisabledLabel = !hasSelectedCombatants
    ? "ENTER_2_NAMES"
    : !hasBattleCredit
      ? "NO_CREDITS"
      : !hasBetReputation
        ? "LOW_REPUTATION"
        : "ENTER_2_NAMES";

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

  useEffect(() => {
    writeStoredArenaWallet(arenaWallet);
  }, [arenaWallet]);

  // Check cache whenever both combatants are selected
  useEffect(() => {
    const leftName = leftCard?.name?.trim();
    const rightName = rightCard?.name?.trim();

    if (!leftName || !rightName) {
      setIsBattleCached(false);
      setCachedBattleRunId(null);
      return;
    }

    let cancelled = false;
    const checkId = ++cacheCheckRef.current;

    void checkBattleCache(leftName, rightName)
      .then((result) => {
        if (cancelled || checkId !== cacheCheckRef.current) return;

        setIsBattleCached(result.cached);
        setCachedBattleRunId(result.battleRunId);
      })
      .catch(() => {
        if (cancelled || checkId !== cacheCheckRef.current) return;

        setIsBattleCached(false);
        setCachedBattleRunId(null);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Cache check is triggered by combatant changes; synchronous guards prevent stale UI.
  }, [leftCard?.name, rightCard?.name]);

  function openReport() {
    setIsReportOpen(true);
  }

  const openLeftLoadoutConsole = useCallback(() => {
    setLoadoutFocusSide("left");
    setIsLoadoutConsoleOpen(true);
  }, []);

  const openRightLoadoutConsole = useCallback(() => {
    setLoadoutFocusSide("right");
    setIsLoadoutConsoleOpen(true);
  }, []);

  const topUpArenaCredits = useCallback(() => {
    setArenaWallet(topUpArenaWallet);
    setBettingStatus(`CREDITS +${CREDIT_TOP_UP_AMOUNT}`);
  }, []);

  function resetBattleState() {
    setIsReportOpen(false);
    setIsReportReady(false);
    setBattleReport(null);
    setBattleError("");
    setIsBattleRequestActive(false);
    setIsBattleLoadingConsoleVisible(false);
    resetBattleTimeline();
    clearLatestBattleReport();
  }

  async function handleViewCachedResult() {
    if (!leftCard?.name || !rightCard?.name || isArenaLocked) {
      return;
    }

    setIsReportOpen(false);
    setIsReportReady(false);
    setBattleReport(null);
    setBattleError("");
    setIsBattleRequestActive(true);
    setIsBattleLoadingConsoleVisible(false);
    setIsLoadoutConsoleOpen(false);
    setBettingStatus("VIEWING_CACHED");
    resetBattleTimeline();
    clearLatestBattleReport();

    let requestSettled = false;
    let loadingConsoleTimeoutId: number | null = window.setTimeout(() => {
      if (!requestSettled) {
        setIsBattleLoadingConsoleVisible(true);
      }
    }, BATTLE_LOADING_CONSOLE_DELAY_MS);

    function clearLoadingConsoleDelay() {
      if (loadingConsoleTimeoutId === null) return;

      window.clearTimeout(loadingConsoleTimeoutId);
      loadingConsoleTimeoutId = null;
    }

    try {
      const report = isDevMode
        ? await requestBattleReportDev({
            fighterA: leftCard.name,
            fighterB: rightCard.name,
          })
        : await requestBattleReport({
            fighterA: leftCard.name,
            fighterB: rightCard.name,
          });
      requestSettled = true;
      clearLoadingConsoleDelay();
      setIsBattleRequestActive(false);
      setIsBattleLoadingConsoleVisible(!isDevMode && report.cached !== true);

      const timelineFinished = startBattleTimeline(report);

      setBattleReport(report);
      await timelineFinished;
      setBettingStatus(isDevMode ? "DEV_MODE_BATTLE" : "CACHED_RESULT_VIEWED");
      setIsReportReady(true);
      setReportSerial((current) => (current ?? reportSerial) + 1);
    } catch (error) {
      setBattleReport(null);
      setIsReportReady(false);
      setBattleError(readBattleErrorMessage(error));
      setIsBattleLoadingConsoleVisible(false);
      resetBattleTimeline();
      clearLatestBattleReport();
      throw error;
    } finally {
      requestSettled = true;
      clearLoadingConsoleDelay();
      setIsBattleRequestActive(false);
      setIsBattleLoadingConsoleVisible(false);
    }
  }

  async function handleBattleStart() {
    if (!leftCard?.name || !rightCard?.name || isArenaLocked) {
      return;
    }

    const lockResult = lockArenaBet(arenaWallet, arenaBet);

    if (!lockResult.ok) {
      setBattleError(lockResult.message);
      throw new Error(lockResult.message);
    }

    const { lockedBet } = lockResult;

    setIsReportOpen(false);
    setIsReportReady(false);
    setBattleReport(null);
    setBattleError("");
    setIsBattleRequestActive(true);
    setIsBattleLoadingConsoleVisible(false);
    setIsLoadoutConsoleOpen(false);
    setBettingStatus(lockResult.status);
    setArenaWallet(lockResult.wallet);
    resetBattleTimeline();
    clearLatestBattleReport();

    let requestSettled = false;
    let loadingConsoleTimeoutId: number | null = window.setTimeout(() => {
      if (!requestSettled) {
        setIsBattleLoadingConsoleVisible(true);
      }
    }, BATTLE_LOADING_CONSOLE_DELAY_MS);

    function clearLoadingConsoleDelay() {
      if (loadingConsoleTimeoutId === null) return;

      window.clearTimeout(loadingConsoleTimeoutId);
      loadingConsoleTimeoutId = null;
    }

    try {
      const report = isDevMode
        ? await requestBattleReportDev({
            fighterA: leftCard.name,
            fighterB: rightCard.name,
          })
        : await requestBattleReport({
            fighterA: leftCard.name,
            fighterB: rightCard.name,
          });
      requestSettled = true;
      clearLoadingConsoleDelay();
      setIsBattleRequestActive(false);
      setIsBattleLoadingConsoleVisible(!isDevMode && report.cached !== true);

      const timelineFinished = startBattleTimeline(report);

      setBattleReport(report);
      await timelineFinished;
      const settlement = isDevMode
        ? { status: "DEV_MODE_BATTLE", payout: 0, wallet: arenaWallet }
        : settleArenaBet(report, lockedBet);

      if (settlement.payout > 0 && settlement.status.startsWith("BET_WON")) {
        const walletEl = document.querySelector(".wallet-widget");
        const walletRect = walletEl?.getBoundingClientRect();
        const walX = walletRect ? walletRect.left + walletRect.width / 2 : 120;
        const walY = walletRect ? walletRect.top + walletRect.height / 2 : 40;

        setCoinFlight({
          sourceX: window.innerWidth / 2 - 7,
          sourceY: window.innerHeight / 2 - 7,
          targetX: walX,
          targetY: walY,
          amount: settlement.payout,
        });
      }

      const settledWallet = applyArenaBetSettlement(arenaWallet, settlement);
      setArenaWallet(settledWallet);
      syncArenaWalletToServer(settledWallet);
      setBettingStatus(settlement.status);
      setIsReportReady(true);
      setReportSerial((current) => (current ?? reportSerial) + 1);
    } catch (error) {
      const refundedWallet = refundArenaLockedBet(arenaWallet, lockedBet);
      setArenaWallet(refundedWallet);
      syncArenaWalletToServer(refundedWallet);
      setBettingStatus("STAKE_REFUNDED");
      setBattleReport(null);
      setIsReportReady(false);
      setBattleError(readBattleErrorMessage(error));
      setIsBattleLoadingConsoleVisible(false);
      resetBattleTimeline();
      clearLatestBattleReport();
      throw error;
    } finally {
      requestSettled = true;
      clearLoadingConsoleDelay();
      setIsBattleRequestActive(false);
      setIsBattleLoadingConsoleVisible(false);
    }
  }

  function resetSelection() {
    setLeftCard(null);
    setRightCard(null);
    setArenaBet(DEFAULT_ARENA_BET);
    setBettingStatus("BETTING_READY");
    setIsLoadoutConsoleOpen(false);
    clearStoredHomeArenaState();
    resetBattleState();
  }

  function loadCombatants({ left, right }: Record<ArenaCardSide, string>) {
    setLeftCard(
      makeCombatantCard(
        leftTemplate,
        left,
        findExactCombatantOption(arenaCombatantOptions, left),
      ),
    );
    setRightCard(
      makeCombatantCard(
        rightTemplate,
        right,
        findExactCombatantOption(arenaCombatantOptions, right),
      ),
    );
    setArenaBet(DEFAULT_ARENA_BET);
    setBettingStatus("BETTING_READY");
    setIsLoadoutConsoleOpen(false);
    resetBattleState();
  }

  return (
    <>
      <section
        className="home-arena-stage h-[100dvh] min-h-[100svh] overflow-hidden px-5 py-[3.5vh] sm:px-8 sm:py-[4vh]"
        data-battle-loading={isBattleSequenceActive ? "true" : undefined}
        data-battle-opener={isBattleOpenerActive ? "true" : undefined}
        data-tab-hidden={!isPageVisible ? "true" : undefined}
        data-view={isReportOpen ? "report" : "setup"}
      >
        {isBattleOpenerActive ? (
          <span aria-hidden="true" className="home-battle-opener">
            <span className="home-battle-opener__shade" />
            <span className="home-battle-opener__scan" />
            <span className="home-battle-opener__line" />
          </span>
        ) : null}

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

        {isBattleTimelineActive && !isBattleOpenerActive && !isReportOpen ? (
          <button
            type="button"
            className="home-battle-skip"
            onClick={skipBattleTimeline}
          >
            SKIP_SIM
          </button>
        ) : null}

        {((isReportReady && battleReport) || leftCard || rightCard) &&
        !isArenaLocked &&
        !isReportOpen ? (
          <div
            className="home-arena-top-actions"
            aria-label="Arena quick actions"
          >
            {isReportReady && battleReport ? (
              <BattleReportButton
                key={reportSerial}
                onViewReport={openReport}
              />
            ) : null}
            {leftCard || rightCard ? (
              <BattleReportButton
                ariaLabel="Reset selected combatants"
                label="RESET_SELECTION"
                onViewReport={resetSelection}
              />
            ) : null}
            {isReportReady && battleReport?.battle_run_id ? (
              <VerdictFeedback
                variant="arena"
                battleRunId={battleReport.battle_run_id}
              />
            ) : null}
          </div>
        ) : null}

        {!isReportOpen ? (
          <ArenaBalancePanel
            cr={arenaWallet.credits}
            rp={arenaWallet.reputation}
            username="PLAYER_001"
            rank={214}
            status={bettingStatus}
            onOpenProfile={() => {
              router.push("/account");
            }}
            onTopUp={topUpArenaCredits}
          />
        ) : null}

        <div
          className="home-arena-flow mx-auto flex h-full w-full max-w-[72rem] flex-col items-center justify-center"
          data-impact-act={battleShockCue?.act}
          data-impact-phase={battleImpactPhase}
        >
          <div className="home-arena-combat-zone w-full">
            <div className="home-arena-setup-grid grid w-full grid-cols-1 justify-items-center gap-7 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)] sm:items-center sm:gap-10 md:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] md:gap-12">
              <div className="sm:justify-self-end">
                <CombatantEntrySlot
                  card={leftCard}
                  crtImpact={leftCrtImpact}
                  crtResetToken={battleGlitchResetToken}
                  isEliminated={displayedEliminatedSide === "left"}
                  template={leftTemplate}
                  label="ALPHA_SLOT"
                  onOpenConsole={openLeftLoadoutConsole}
                />
              </div>

              <ArenaVersusMark />

              <div className="sm:justify-self-start">
                <CombatantEntrySlot
                  card={rightCard}
                  crtImpact={rightCrtImpact}
                  crtResetToken={battleGlitchResetToken}
                  isEliminated={displayedEliminatedSide === "right"}
                  template={rightTemplate}
                  label="OMEGA_SLOT"
                  onOpenConsole={openRightLoadoutConsole}
                />
              </div>
            </div>

            {isLoadoutConsoleOpen && !isReportOpen ? (
              <CombatantLoadoutConsole
                initialFocusSide={loadoutFocusSide}
                initialLeftName={leftCard?.name}
                initialRightName={rightCard?.name}
                options={arenaCombatantOptions}
                onClose={() => setIsLoadoutConsoleOpen(false)}
                onSubmit={loadCombatants}
              />
            ) : null}

            {isReportOpen && leftCard && rightCard && battleReport ? (
              <div className="home-arena-report-layout">
                <CombatantDeck
                  cards={[leftCard, rightCard]}
                  onReturn={() => setIsReportOpen(false)}
                />
                <BattleResultPanel playIntro report={battleReport} />
              </div>
            ) : null}
          </div>

          {isBattleLoadingVisible ? (
            <BattleLoadingConsole
              fighterA={leftCard?.name}
              fighterB={rightCard?.name}
            />
          ) : null}

          <div className="home-arena-controls flex w-full flex-col items-center">
            {battleError ? (
              <p className="home-arena-battle-error" role="alert">
                {battleError}
              </p>
            ) : null}
            {leftCard && rightCard ? (
              <ArenaBetSelector
                bet={arenaBet}
                disabled={isArenaLocked || isBattleCached}
                leftCard={leftCard}
                maxReputation={arenaWallet.reputation}
                onBetChange={setArenaBet}
                rightCard={rightCard}
              />
            ) : (
              <p className="mb-3 text-center text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[#d7e2d6]/62">
                LOAD_TWO_COMBATANTS_TO_ENABLE_BATTLE
              </p>
            )}
            {isBattleCached && hasSelectedCombatants && !isDevMode ? (
              <button
                type="button"
                disabled={isArenaLocked}
                onClick={handleViewCachedResult}
                className="home-battle-button relative grid h-[3.3rem] max-h-[3.3rem] min-h-[3.3rem] w-[min(82vw,16rem)] flex-none basis-[3.3rem] place-items-center overflow-hidden border border-[#3a3a1a] bg-black/84 px-6 py-0 text-center text-[0.8rem] font-bold uppercase leading-none tracking-[0.12em] text-[#b7a868] outline-none transition-colors duration-150 disabled:cursor-not-allowed sm:h-[3.6rem] sm:max-h-[3.6rem] sm:min-h-[3.6rem] sm:basis-[3.6rem] sm:w-72 sm:text-[0.86rem]"
              >
                <span className="relative z-10">VIEW_RESULT</span>
              </button>
            ) : (
              <BattleControls
                canStart={canExecuteBattle || isDevMode}
                disabledLabel={
                  isDevMode && hasSelectedCombatants
                    ? "DEV_BATTLE"
                    : battleDisabledLabel
                }
                fighterA={leftCard?.name ?? null}
                fighterB={rightCard?.name ?? null}
                onBattleStart={handleBattleStart}
              />
            )}
            {isReportReady && battleReport && isDevMode && (
              <span className="mt-1 rounded border border-[#68b768]/40 bg-[#68b768]/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#68b768]">
                DEV BUILD
              </span>
            )}
          </div>
        </div>
      </section>

      {isAdmin && (
        <label
          className="fixed bottom-4 right-4 z-50 flex cursor-pointer items-center gap-2 rounded border border-[#1a3a1a] bg-black/84 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[#68b768] select-none shadow-lg backdrop-blur-sm transition-colors hover:bg-black/94"
          data-dev-mode={isDevMode ? "on" : "off"}
          onClick={toggleDevMode}
        >
          <span className="relative inline-flex h-4 w-7 items-center rounded-full border border-[#1a3a1a] bg-black/70 transition-colors">
            <span
              className={`inline-block h-3 w-3 translate-x-0.5 rounded-full transition-transform ${isDevMode ? "translate-x-[0.8rem] bg-[#68b768]" : "bg-[#444]"}`}
            />
          </span>
          DEV
        </label>
      )}

      {coinFlight && (
        <CoinFlightAnimation
          sourceX={coinFlight.sourceX}
          sourceY={coinFlight.sourceY}
          targetX={coinFlight.targetX}
          targetY={coinFlight.targetY}
          coinCount={12}
          onComplete={() => setCoinFlight(null)}
        />
      )}
    </>
  );
}

function readBattleErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Battle request failed. Try again.";
}
