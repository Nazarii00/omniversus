"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  BattleResultPanel,
  clearLatestBattleReport,
  MOCK_BATTLE_REPORT,
  writeLatestBattleReport,
  type BattleReportJson,
} from "@/features/battle-report";

import { arenaCards, combatantAutocompleteOptions } from "../../data";
import type { ArenaCard, ArenaCardSide } from "../../model";
import { ArenaVersusMark } from "../arena";
import {
  BattleControls,
  BattleLoadingConsole,
  BattleReportButton,
} from "../battle-controls";
import { ArenaBetSelector } from "../betting";
import { CombatantDeck } from "../combatant-deck";
import {
  CombatantEntrySlot,
  CombatantLoadoutConsole,
} from "../combatant-entry";

function makeCombatantCard(template: ArenaCard, name: string): ArenaCard {
  const trimmedName = name.trim();

  return {
    ...template,
    id: `${template.side}-${trimmedName.toLowerCase().replace(/\s+/g, "-")}`,
    name: trimmedName,
    universe: "Input Pending",
    stance:
      template.side === "left"
        ? "Queued as left-side contender"
        : "Queued as right-side contender",
    backCopy:
      "Temporary test card generated from the arena input slot. Full dossier data will come from the battle report pipeline.",
  };
}

const HOME_ARENA_STORAGE_KEY = "omniversus.homeArenaState";
const HOME_ARENA_STORAGE_EVENT = "omniversus.homeArenaStateChanged";

type StoredHomeArenaState = {
  leftName?: string;
  rightName?: string;
  battleReport?: BattleReportJson | null;
  isReportReady?: boolean;
  reportSerial?: number;
};

function homeArenaStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function emitHomeArenaStorageChange() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(HOME_ARENA_STORAGE_EVENT));
}

function readStoredHomeArenaStateText() {
  let storedState: string | null = null;

  try {
    storedState = homeArenaStorage()?.getItem(HOME_ARENA_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }

  if (!storedState) return null;

  return storedState;
}

function parseStoredHomeArenaState(storedState: string | null) {
  if (!storedState) return null;

  try {
    return JSON.parse(storedState) as StoredHomeArenaState;
  } catch {
    return null;
  }
}

function writeStoredHomeArenaState(state: StoredHomeArenaState) {
  const storage = homeArenaStorage();
  if (!storage) return;

  const hasArenaState =
    Boolean(state.leftName || state.rightName || state.battleReport) ||
    Boolean(state.isReportReady);

  if (!hasArenaState) {
    try {
      storage.removeItem(HOME_ARENA_STORAGE_KEY);
      emitHomeArenaStorageChange();
    } catch {
      // Ignore blocked storage; the current React state remains usable.
    }
    return;
  }

  try {
    storage.setItem(HOME_ARENA_STORAGE_KEY, JSON.stringify(state));
    emitHomeArenaStorageChange();
  } catch {
    // Ignore blocked storage; the current React state remains usable.
  }
}

function clearStoredHomeArenaState() {
  try {
    homeArenaStorage()?.removeItem(HOME_ARENA_STORAGE_KEY);
    emitHomeArenaStorageChange();
  } catch {
    // Ignore blocked storage during reset.
  }
}

function subscribeToHomeArenaStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(HOME_ARENA_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(HOME_ARENA_STORAGE_EVENT, onStoreChange);
  };
}

export default function HomeArenaStage() {
  const [leftTemplate, rightTemplate] = arenaCards;
  const storedArenaStateText = useSyncExternalStore(
    subscribeToHomeArenaStorage,
    readStoredHomeArenaStateText,
    () => null,
  );
  const storedArenaState = useMemo(
    () => parseStoredHomeArenaState(storedArenaStateText),
    [storedArenaStateText],
  );
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
  const [leftCardState, setLeftCard] = useState<
    ArenaCard | null | undefined
  >();
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
  const [battleError, setBattleError] = useState<string | null>(null);
  const [reportSerialState, setReportSerial] = useState<number | undefined>();
  const [isLoadoutConsoleOpen, setIsLoadoutConsoleOpen] = useState(false);
  const [isBattleLoading, setIsBattleLoading] = useState(false);
  const [loadoutFocusSide, setLoadoutFocusSide] =
    useState<ArenaCardSide>("left");
  const hasRunPersistenceEffect = useRef(false);
  const leftCard =
    leftCardState === undefined ? restoredLeftCard : leftCardState;
  const rightCard =
    rightCardState === undefined ? restoredRightCard : rightCardState;
  const battleReport =
    battleReportState === undefined ? storedBattleReport : battleReportState;
  const isReportReady =
    isReportReadyState ??
    Boolean(storedArenaState?.isReportReady && storedBattleReport);
  const reportSerial =
    reportSerialState ?? storedArenaState?.reportSerial ?? 0;

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
    setBattleError(null);
    clearLatestBattleReport();
  }

  function handleBattleStart() {
    resetBattleState();
    setIsBattleLoading(true);
  }

  function resetSelection() {
    setLeftCard(null);
    setRightCard(null);
    setIsLoadoutConsoleOpen(false);
    setIsBattleLoading(false);
    clearStoredHomeArenaState();
    resetBattleState();
  }

  function loadCombatants({ left, right }: Record<ArenaCardSide, string>) {
    setLeftCard(makeCombatantCard(leftTemplate, left));
    setRightCard(makeCombatantCard(rightTemplate, right));
    setIsLoadoutConsoleOpen(false);
    setIsBattleLoading(false);
    resetBattleState();
  }

  return (
    <section
      className="home-arena-stage h-screen overflow-hidden px-5 py-[3.5vh] sm:px-8 sm:py-[4vh]"
      data-view={isReportOpen ? "report" : "setup"}
    >
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

      {isBattleLoading && !isReportOpen ? (
        <BattleLoadingConsole
          fighterA={leftCard?.name}
          fighterB={rightCard?.name}
        />
      ) : null}

      <div className="home-arena-flow mx-auto flex h-full w-full max-w-[72rem] flex-col items-center justify-center">
        <div className="home-arena-combat-zone w-full">
          <div className="home-arena-setup-grid grid w-full grid-cols-1 justify-items-center gap-7 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)] sm:items-center sm:gap-10 md:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] md:gap-12">
            <div className="sm:justify-self-end">
              <CombatantEntrySlot
                card={leftCard}
                template={leftTemplate}
                label="ALPHA_SLOT"
                onOpenConsole={() => openLoadoutConsole("left")}
              />
            </div>

            <ArenaVersusMark />

            <div className="sm:justify-self-start">
              <CombatantEntrySlot
                card={rightCard}
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
            fighterA={leftCard?.name ?? null}
            fighterB={rightCard?.name ?? null}
            onBattleStart={handleBattleStart}
            onReportReady={(report) => {
              setIsBattleLoading(false);
              setBattleReport(report);
              writeLatestBattleReport(report);
              setReportSerial((current) => (current ?? reportSerial) + 1);
              setIsReportReady(true);
            }}
            onBattleError={(message) => {
              setIsBattleLoading(false);
              setBattleError(message);
            }}
          />
          {battleError ? (
            <p className="mt-3 max-w-[38rem] text-center text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#ffb4a8]">
              &gt; API_ERROR: {battleError}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
