"use client";

import { useState } from "react";

import type { BattleReportJson } from "./battle-report/BattleResultPanel";
import { arenaCards } from "../data/arenaCards";
import type { ArenaCard } from "../types";
import ArenaBetSelector from "./ArenaBetSelector";
import ArenaVersusMark from "./ArenaVersusMark";
import BattleResultPanel from "./battle-report/BattleResultPanel";
import CombatantDeck from "./battle-report/CombatantDeck";
import BattleControls from "./battle-controls/BattleControls";
import BattleReportButton from "./battle-controls/BattleReportButton";
import { MOCK_BATTLE_REPORT } from "./battle-controls/mockBattleReport";
import CombatantEntrySlot from "./CombatantEntrySlot";

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

export default function HomeArenaStage() {
  const [leftTemplate, rightTemplate] = arenaCards;
  const [leftCard, setLeftCard] = useState<ArenaCard | null>(null);
  const [rightCard, setRightCard] = useState<ArenaCard | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReportReady, setIsReportReady] = useState(false);
  const [battleReport, setBattleReport] = useState<BattleReportJson | null>(
    null,
  );
  const [battleError, setBattleError] = useState<string | null>(null);
  const [reportSerial, setReportSerial] = useState(0);

  function openReport() {
    console.log("[BATTLE_UI] full report", battleReport ?? MOCK_BATTLE_REPORT);
    setIsReportOpen(true);
  }

  return (
    <section
      className="home-arena-stage h-screen overflow-hidden px-5 py-[3.5vh] sm:px-8 sm:py-[4vh]"
      data-view={isReportOpen ? "report" : "setup"}
    >
      {isReportReady && !isReportOpen ? (
        <BattleReportButton key={reportSerial} onViewReport={openReport} />
      ) : null}

      <div className="home-arena-flow mx-auto flex h-full w-full max-w-[72rem] flex-col items-center justify-center">
        <div className="home-arena-combat-zone w-full">
          <div className="home-arena-setup-grid grid w-full grid-cols-1 justify-items-center gap-7 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)] sm:items-center sm:gap-10 md:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] md:gap-12">
            <div className="sm:justify-self-end">
              <CombatantEntrySlot
                card={leftCard}
                template={leftTemplate}
                label="ALPHA_SLOT"
                onCommitName={(name) =>
                  setLeftCard(makeCombatantCard(leftTemplate, name))
                }
              />
            </div>

            <ArenaVersusMark />

            <div className="sm:justify-self-start">
              <CombatantEntrySlot
                card={rightCard}
                template={rightTemplate}
                label="OMEGA_SLOT"
                onCommitName={(name) =>
                  setRightCard(makeCombatantCard(rightTemplate, name))
                }
              />
            </div>
          </div>

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
            onBattleStart={() => {
              setIsReportOpen(false);
              setIsReportReady(false);
              setBattleReport(null);
              setBattleError(null);
            }}
            onReportReady={(report) => {
              setBattleReport(report);
              setReportSerial((current) => current + 1);
              setIsReportReady(true);
            }}
            onBattleError={(message) => {
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
