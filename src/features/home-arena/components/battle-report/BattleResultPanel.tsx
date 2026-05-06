"use client";

import { useMemo, type CSSProperties } from "react";

import type { BattleReportJson } from "../../types";
import ReportSignalDeck from "./ReportSignalDeck";
import { normalizeReport, terminalLabel } from "./reportViewModel";

type BattleResultPanelProps = {
  playIntro: boolean;
  report?: BattleReportJson;
};

const CONTENT_INTRO_DELAY_MS = 780;

export default function BattleResultPanel({
  playIntro,
  report,
}: BattleResultPanelProps) {
  const view = useMemo(() => normalizeReport(report), [report]);
  const battleStates = view.steps;

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
        <div className="home-report-terminal-grid home-report-terminal-grid--free">
          <div className="home-report-free-column home-report-free-column--acts">
            <div
              className="home-battle-result-panel__section home-report-summary home-report-free-verdict"
              style={blockStyle(320)}
            >
              <div className="home-report-panel-heading home-report-panel-heading--stacked">
                <span className="home-report-panel-heading__title">
                  <span className="home-report-panel-heading__label">
                    QUICK_VERDICT
                  </span>
                  <span className="home-report-panel-heading__terminal">
                    &gt; free.summary
                  </span>
                </span>
                <span>PUBLIC</span>
              </div>
              <p className="home-report-free-verdict__winner">
                {terminalLabel(view.winnerName)}
              </p>
              <p className="home-report-free-verdict__reason">
                <span>&gt;</span> {view.chainTeaser}
              </p>
              <div className="home-report-free-verdict__facts">
                <p>
                  <span>difficulty</span>
                  <b>{view.difficulty}</b>
                </p>
                <p>
                  <span>confidence</span>
                  <b>{view.confidence}%</b>
                </p>
                <p>
                  <span>data / robust</span>
                  <b>
                    {view.dataConfidence}/{view.robustnessConfidence}
                  </b>
                </p>
              </div>
              <div className="home-report-free-verdict__tags">
                {view.tags.slice(0, 5).map((tag) => (
                  <span key={tag} className="home-report-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="home-report-flow home-report-flow--free"
              style={blockStyle(450)}
            >
              <div className="home-report-panel-heading home-report-panel-heading--stacked">
                <span className="home-report-panel-heading__title">
                  <span className="home-report-panel-heading__label">
                    BATTLE_STATES
                  </span>
                  <span className="home-report-panel-heading__terminal">
                    &gt; narrative.timeline
                  </span>
                </span>
                <span>{battleStates.length}_STATES</span>
              </div>
              <p className="home-report-flow__hint">
                Free tier · Public log accessible
              </p>
              <div className="home-report-free-beats">
                {battleStates.map((step, index) => (
                  <article
                    key={step.id}
                    className="home-report-step-block home-report-step-block--static"
                    data-contested={step.contested}
                  >
                    <span className="home-report-step-block__top">
                      <span>&gt; {battleStateLabel(index)}</span>
                      <span>PUBLIC_LOG</span>
                    </span>
                    <span className="home-report-step-block__title">
                      {terminalLabel(step.title)}
                    </span>
                    <span className="home-report-step-block__log">
                      {step.log}
                    </span>
                    <span className="home-report-step-block__why">
                      <b>WHY:</b> {step.why}
                    </span>
                    <span className="home-report-step-block__meta">
                      <span>A_HP: {step.aHp ?? "N_A"}</span>
                      <span>B_HP: {step.bHp ?? "N_A"}</span>
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </div>

          <div className="home-report-free-column home-report-free-column--graphs">
            <ReportSignalDeck view={view} style={blockStyle(560)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function battleStateLabel(index: number) {
  return (
    ["OPENING", "PRESSURE", "PIVOT", "BREAKPOINT", "FINISH"][index] ??
    `STATE_${String(index + 1).padStart(2, "0")}`
  );
}
