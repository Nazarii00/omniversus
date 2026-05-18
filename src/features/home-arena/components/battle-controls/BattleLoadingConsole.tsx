"use client";

import { useEffect, useMemo, useState } from "react";

type LoadingStep =
  | {
      kind: "line";
      text: string;
      holdMs?: number;
    }
  | {
      kind: "progress";
      label: string;
      fillMs: number;
      holdMs?: number;
      width?: number;
    };

type LoadingTimelineEntry = {
  step: LoadingStep;
  startsAtMs: number;
  endsAtMs: number;
  durationMs: number;
};

type LoadingRow = {
  key: string;
  text: string;
  isActive: boolean;
};

type BattleLoadingConsoleProps = {
  fighterA?: string | null;
  fighterB?: string | null;
};

const TYPE_MS_PER_CHAR = 32;
const LINE_HOLD_MS = 460;
const MIN_LINE_MS = 1250;
const PROGRESS_HOLD_MS = 460;
const PROGRESS_WIDTH = 13;
const TICK_MS = 32;
const VISIBLE_LINE_COUNT = 11;
const WAITING_LINE_WINDOW_MS = 3200;
const MINIMUM_REVEAL_STEP_COUNT = 19;

const WAITING_LINES = [
  "AWAITING API RESPONSE...",
  "KEEPING SOCKET OPEN...",
  "LISTENING FOR MODEL TOKENS...",
  "HOLDING REPORT BUFFER...",
  "VERIFYING JSON ARRIVAL...",
];

function normalizeConsoleToken(
  value: string | null | undefined,
  fallback: string,
) {
  const token = value?.trim() ? value.trim() : fallback;
  const normalized = token.replace(/\s+/g, "_").toUpperCase();

  return normalized.length > 32 ? `${normalized.slice(0, 29)}...` : normalized;
}

function buildLoadingSteps(
  fighterA: string | null | undefined,
  fighterB: string | null | undefined,
): LoadingStep[] {
  const alpha = normalizeConsoleToken(fighterA, "ALPHA_SLOT");
  const omega = normalizeConsoleToken(fighterB, "OMEGA_SLOT");

  return [
    { kind: "line", text: "REQUEST DISPATCHED -> POST /api/battle" },
    { kind: "line", text: `PAYLOAD LOCKED: ${alpha} // ${omega}` },
    { kind: "progress", label: "UPLINK_HANDSHAKE", fillMs: 1700 },
    { kind: "line", text: "ANALYSIS THREAD RESERVED" },
    { kind: "line", text: "CANON INDEX: aliases and source tags queued" },
    { kind: "progress", label: "CANON_SOURCE_SWEEP", fillMs: 2000 },
    { kind: "line", text: `DOSSIER_STUB[A]: ${alpha} feats staged` },
    { kind: "line", text: `DOSSIER_STUB[B]: ${omega} resistances staged` },
    { kind: "line", text: "STAT_NORMALIZER: AP / speed / durability split" },
    { kind: "line", text: "ABILITY_ROUTER: hax, counters, passives, BFR" },
    { kind: "progress", label: "MATCHUP_MATRIX", fillMs: 2300 },
    { kind: "line", text: "NARRATIVE[01]: arena entry placeholder" },
    { kind: "line", text: "NARRATIVE[02]: opening range probe" },
    { kind: "line", text: "NARRATIVE[03]: first exchange shell" },
    { kind: "line", text: "NARRATIVE[04]: defense branch seeded" },
    { kind: "line", text: "NARRATIVE[05]: escalation beat reserved" },
    { kind: "line", text: "NARRATIVE[06]: counter-route pressure test" },
    { kind: "line", text: "NARRATIVE[07]: stamina/terrain pass" },
    { kind: "line", text: "NARRATIVE[08]: decisive interaction slot" },
    { kind: "progress", label: "ROUND_SCRIPT_SIM", fillMs: 2600 },
    { kind: "line", text: "ANTI_ARGUMENT: losing side best route checked" },
    { kind: "line", text: "QUALITY_FLAGS: confidence placeholders attached" },
    { kind: "progress", label: "VERDICT_SYNTHESIS", fillMs: 2100 },
    { kind: "line", text: "REPORT SHELL READY; WAITING FOR API RETURN" },
  ];
}

function readVisibleText(
  line: string,
  elapsedMs: number,
  typingMs = line.length * TYPE_MS_PER_CHAR,
) {
  const progress = Math.min(1, Math.max(0, elapsedMs / typingMs));
  const visibleChars = Math.floor(progress * line.length);

  return line.slice(0, visibleChars);
}

function getStepDuration(step: LoadingStep) {
  if (step.kind === "progress") {
    return (
      step.label.length * TYPE_MS_PER_CHAR +
      step.fillMs +
      PROGRESS_HOLD_MS +
      (step.holdMs ?? 0)
    );
  }

  return Math.max(
    MIN_LINE_MS,
    step.text.length * TYPE_MS_PER_CHAR + LINE_HOLD_MS + (step.holdMs ?? 0),
  );
}

function buildLoadingTimeline(steps: LoadingStep[]) {
  let cursorMs = 0;

  return steps.map((step) => {
    const durationMs = getStepDuration(step);
    const entry: LoadingTimelineEntry = {
      step,
      startsAtMs: cursorMs,
      endsAtMs: cursorMs + durationMs,
      durationMs,
    };

    cursorMs += durationMs;

    return entry;
  });
}

function getSequenceDurationMs(timeline: LoadingTimelineEntry[]) {
  return timeline[timeline.length - 1]?.endsAtMs ?? 0;
}

function buildProgressBar(progress: number, width = PROGRESS_WIDTH) {
  const filled = Math.round(Math.min(1, Math.max(0, progress)) * width);

  return `${"#".repeat(filled)}${".".repeat(width - filled)}`;
}

function readProgressText(
  step: Extract<LoadingStep, { kind: "progress" }>,
  elapsedMs: number,
) {
  const label = `${step.label} `;
  const labelTypingMs = label.length * TYPE_MS_PER_CHAR;

  if (elapsedMs < labelTypingMs) {
    return readVisibleText(label, elapsedMs, labelTypingMs);
  }

  const fillElapsedMs = Math.min(step.fillMs, elapsedMs - labelTypingMs);
  const progress = Math.min(1, Math.max(0, fillElapsedMs / step.fillMs));
  const percent = Math.floor(progress * 100)
    .toString()
    .padStart(3, "0");

  return `${label}[${buildProgressBar(progress, step.width)}] ${percent}%`;
}

function readStepText(entry: LoadingTimelineEntry, elapsedMs: number) {
  const { step } = entry;
  const stepElapsedMs = Math.max(0, elapsedMs - entry.startsAtMs);

  if (step.kind === "progress") {
    return readProgressText(step, stepElapsedMs);
  }

  return readVisibleText(step.text, stepElapsedMs);
}

function readWaitingText(elapsedMs: number) {
  const waitingIndex =
    Math.floor(elapsedMs / WAITING_LINE_WINDOW_MS) % WAITING_LINES.length;
  const text = WAITING_LINES[waitingIndex] ?? WAITING_LINES[0];
  const lineElapsedMs = elapsedMs % WAITING_LINE_WINDOW_MS;
  const typingMs = Math.min(
    text.length * TYPE_MS_PER_CHAR,
    WAITING_LINE_WINDOW_MS - LINE_HOLD_MS,
  );

  return {
    key: `waiting-${waitingIndex}`,
    text: readVisibleText(text, lineElapsedMs, typingMs),
  };
}

export function getBattleLoadingSequenceMs(
  fighterA?: string | null,
  fighterB?: string | null,
) {
  const timeline = buildLoadingTimeline(buildLoadingSteps(fighterA, fighterB));
  const requiredEntry =
    timeline[Math.min(MINIMUM_REVEAL_STEP_COUNT, timeline.length) - 1];

  return requiredEntry?.endsAtMs ?? getSequenceDurationMs(timeline);
}

export default function BattleLoadingConsole({
  fighterA,
  fighterB,
}: BattleLoadingConsoleProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const timeline = useMemo(
    () => buildLoadingTimeline(buildLoadingSteps(fighterA, fighterB)),
    [fighterA, fighterB],
  );
  const sequenceMs = useMemo(() => getSequenceDurationMs(timeline), [timeline]);

  useEffect(() => {
    const startedAt = window.performance.now();
    const intervalId = window.setInterval(() => {
      setElapsedMs(window.performance.now() - startedAt);
    }, TICK_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  const activeLineIndex = timeline.findIndex(
    (entry) => elapsedMs < entry.endsAtMs,
  );
  const hasCompletedSequence = elapsedMs >= sequenceMs;
  const waitingRow = hasCompletedSequence
    ? readWaitingText(elapsedMs - sequenceMs)
    : null;
  const timelineLineCount = waitingRow
    ? VISIBLE_LINE_COUNT - 1
    : VISIBLE_LINE_COUNT;
  const rows: LoadingRow[] = timeline
    .map((entry, index) => {
      if (elapsedMs < entry.startsAtMs) return null;

      return {
        key: `${index}-${entry.startsAtMs}`,
        text:
          elapsedMs >= entry.endsAtMs
            ? entry.step.kind === "progress"
              ? readProgressText(entry.step, entry.durationMs)
              : entry.step.text
            : readStepText(entry, elapsedMs),
        isActive: !hasCompletedSequence && index === activeLineIndex,
      };
    })
    .filter((row): row is LoadingRow => Boolean(row))
    .slice(-timelineLineCount);
  const statusPercent = Math.min(
    99,
    Math.floor((elapsedMs / Math.max(1, sequenceMs)) * 100),
  )
    .toString()
    .padStart(2, "0");

  return (
    <aside
      className="home-loadout-console home-battle-loading-console"
      aria-label="Battle analysis loading"
    >
      <div className="home-loadout-console__titlebar">
        <span className="home-loadout-console__title">
          C:\Omniversus\battle-analysis.cmd
        </span>
        <span className="home-battle-loading-console__status">
          {hasCompletedSequence ? "[WAIT]" : `[RUN ${statusPercent}%]`}
        </span>
      </div>
      <div
        className="home-loadout-console__screen home-battle-loading-console__screen"
        aria-live="polite"
        aria-atomic="false"
      >
        {rows.map((row) => (
          <p key={row.key}>
            <span>&gt; </span>
            <span>{row.text}</span>
            {row.isActive ? (
              <span className="home-battle-loading-console__cursor" />
            ) : null}
          </p>
        ))}

        {waitingRow ? (
          <p key={waitingRow.key}>
            <span>&gt; </span>
            <span>{waitingRow.text}</span>
            <span className="home-battle-loading-console__cursor" />
          </p>
        ) : null}
      </div>
    </aside>
  );
}
