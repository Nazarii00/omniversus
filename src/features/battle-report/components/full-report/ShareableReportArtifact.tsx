"use client";

import { useState } from "react";

import {
  displayTitle,
  displayVerdict,
  formatSide,
  marginStrength,
  valueText,
  type ReportArgumentChain,
  type ReportComparisonRow,
  type ReportFighter,
  type ReportViewModel,
} from "../../model";
import styles from "./FullBattleReportPage.module.css";

const ARTIFACT_WIDTH = 1080;
const ARTIFACT_HEIGHT = 1350;
const PAPER_X = 56;
const PAPER_Y = 46;
const PAPER_WIDTH = 968;
const PAPER_HEIGHT = 1260;
const MAX_SHARE_LINES = 4;

type ShareableReportActionsProps = {
  comparison: ReportComparisonRow[];
  decisiveChain: ReportArgumentChain | null;
  hasStoredReport: boolean;
  summary: string;
  view: ReportViewModel;
};

type ArtifactSubject = {
  initials: string;
  name: string;
  origin: string;
  profile: string;
  side: "A" | "B";
  threat: string;
  tier: string;
};

type ArtifactMetric = {
  aScore: number;
  bScore: number;
  contested: boolean;
  label: string;
  margin: string;
  winner: string;
};

type ArtifactLog = {
  label: string;
  tone: "normal" | "danger" | "success";
  value: string;
};

type ShareableArtifact = {
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

type ExportStatus = {
  tone: "ok" | "error" | "idle";
  text: string;
};

export function ShareableReportActions({
  comparison,
  decisiveChain,
  hasStoredReport,
  summary,
  view,
}: ShareableReportActionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<ExportStatus>({
    tone: "idle",
    text: "",
  });

  async function exportPng(action: "download" | "share") {
    setIsExporting(true);
    setStatus({ tone: "idle", text: "" });

    try {
      const artifact = buildShareableArtifact({
        comparison,
        decisiveChain,
        hasStoredReport,
        summary,
        view,
      });
      const svgMarkup = renderShareableReportSvg(artifact);
      const fileName = shareFileName(artifact);
      const blob = await renderSvgToPngBlob(svgMarkup);
      const file = new File([blob], fileName, { type: "image/png" });

      if (action === "share" && canShareFile(file)) {
        await navigator.share({
          files: [file],
          text: `${artifact.subjects[0].name} vs ${artifact.subjects[1].name}`,
          title: artifact.title,
        });
        setStatus({ tone: "ok", text: "SHARE FILE READY" });
        return;
      }

      downloadBlob(blob, fileName);
      setStatus({
        tone: "ok",
        text:
          action === "share"
            ? "SHARE NOT AVAILABLE HERE - PNG DOWNLOADED"
            : "PNG DOWNLOADED",
      });
    } catch {
      setStatus({
        tone: "error",
        text: "EXPORT FAILED - TRY DOWNLOAD AGAIN",
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className={styles.shareReportActions}>
      <button
        type="button"
        disabled={isExporting}
        onClick={() => void exportPng("share")}
      >
        Share PNG
      </button>
      <button
        type="button"
        disabled={isExporting}
        onClick={() => void exportPng("download")}
      >
        Download PNG
      </button>
      {status.text ? (
        <span className={styles.shareReportStatus} data-tone={status.tone}>
          {status.text}
        </span>
      ) : null}
    </div>
  );
}

function buildShareableArtifact({
  comparison,
  decisiveChain,
  hasStoredReport,
  summary,
  view,
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
  const logs = [
    {
      label: "WIN CONDITION",
      tone: "danger" as const,
      value:
        decisiveChain?.conclusion ??
        view.verdict.primary_reason ??
        view.chainTeaser,
    },
    {
      label: "COUNTER ROUTE",
      tone: "success" as const,
      value:
        view.verdict.why_not_other_side ?? view.verdict.loser_best_argument,
    },
    {
      label: "REVERSAL VECTOR",
      tone: "normal" as const,
      value: view.verdict.flip_condition,
    },
  ];

  return {
    classification: hasStoredReport ? "DECLASSIFIED" : "ARCHIVE SAMPLE",
    confidence: view.confidence,
    difficulty: view.difficulty,
    docRef: docRef(view.id),
    logs: logs.map((log) => ({
      ...log,
      value: valueText(log.value),
    })),
    metrics: buildArtifactMetrics(comparison),
    outcome: view.verdict.primary_reason ?? view.chainTeaser,
    reportId: view.id,
    summary,
    subjects,
    title: "COMBAT SIMULATION REPORT",
    winner,
    winnerSide: view.verdict.winner_side,
  };
}

function buildSubject(
  fighter: ReportFighter | undefined,
  side: "A" | "B",
): ArtifactSubject {
  const name = fighter?.name ?? `Subject ${side}`;
  const origin =
    fighter?.origin?.full_title ??
    fighter?.origin?.abbreviation ??
    fighter?.verse ??
    fighter?.origin?.continuity;
  const profile =
    fighter?.profile?.abilities ??
    fighter?.profile?.win_conditions?.[0] ??
    fighter?.tier?.basis;

  return {
    initials: initialsFor(name || side),
    name,
    origin: valueText(origin),
    profile: valueText(profile),
    side,
    threat: valueText(fighter?.tier?.basis),
    tier: valueText(fighter?.tier?.rating),
  };
}

function buildArtifactMetrics(
  comparison: ReportComparisonRow[],
): ArtifactMetric[] {
  const fallbackRows: ReportComparisonRow[] = [
    {
      category: "AP",
      reason: "No comparison row filed.",
      winner: "TIE",
    },
    {
      category: "SPEED",
      reason: "No comparison row filed.",
      winner: "TIE",
    },
    {
      category: "DURABILITY",
      reason: "No comparison row filed.",
      winner: "TIE",
    },
  ];
  const sourceRows = comparison.length ? comparison : fallbackRows;

  return sourceRows.slice(0, 5).map((row) => {
    const scores = splitMetricScore(row);

    return {
      ...scores,
      contested: Boolean(row.contested),
      label: displayVerdict(row.category),
      margin: valueText(row.margin),
      winner: displayVerdict(row.winner ?? "TIE"),
    };
  });
}

function splitMetricScore(row: ReportComparisonRow) {
  const normalizedWinner = row.winner;
  const normalizedMargin = row.margin?.toUpperCase() ?? "";
  const isTie =
    !normalizedWinner ||
    normalizedWinner === "TIE" ||
    normalizedWinner === "DRAW" ||
    normalizedWinner === "INCONCLUSIVE" ||
    normalizedWinner === "BOTH" ||
    normalizedWinner === "SYSTEM" ||
    normalizedMargin.includes("TIE") ||
    normalizedMargin.includes("EVEN") ||
    normalizedMargin.includes("NONE");

  if (isTie) return { aScore: 62, bScore: 62 };

  const strength = marginStrength(row.margin);
  const lead = Math.round(58 + strength * 0.34);
  const trail = Math.round(61 - strength * 0.12);

  if (normalizedWinner === "A") {
    return {
      aScore: clampScore(lead),
      bScore: clampScore(trail),
    };
  }

  if (normalizedWinner === "B") {
    return {
      aScore: clampScore(trail),
      bScore: clampScore(lead),
    };
  }

  return { aScore: 62, bScore: 62 };
}

function renderShareableReportSvg(artifact: ShareableArtifact) {
  const subjectA = artifact.subjects[0];
  const subjectB = artifact.subjects[1];
  const titleLines = wrapText(artifact.summary, 86, 2);
  const outcomeLines = wrapText(artifact.outcome, 78, 3);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${ARTIFACT_WIDTH}" height="${ARTIFACT_HEIGHT}" viewBox="0 0 ${ARTIFACT_WIDTH} ${ARTIFACT_HEIGHT}" role="img" aria-label="${escapeSvg(`${subjectA.name} versus ${subjectB.name} paper simulation report`)}">
  <defs>
    <filter id="paperNoise" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" seed="13" result="noise" />
      <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
      <feComponentTransfer in="mono" result="softNoise">
        <feFuncA type="table" tableValues="0 0.09" />
      </feComponentTransfer>
      <feBlend in="SourceGraphic" in2="softNoise" mode="multiply" />
    </filter>
    <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#eee5bd" />
      <stop offset="0.48" stop-color="#d9cfaa" />
      <stop offset="1" stop-color="#c8bd96" />
    </linearGradient>
    <linearGradient id="greenInk" x1="0" x2="1">
      <stop offset="0" stop-color="#315833" />
      <stop offset="1" stop-color="#627646" />
    </linearGradient>
    <linearGradient id="brownInk" x1="0" x2="1">
      <stop offset="0" stop-color="#2d2416" />
      <stop offset="1" stop-color="#6d5d38" />
    </linearGradient>
    <style>
      .ink{fill:#383324;font-family:"Courier New",monospace}
      .muted{fill:#756d50;font-family:"Courier New",monospace}
      .red{fill:#9b2f2c;font-family:"Courier New",monospace}
      .green{fill:#265c32;font-family:"Courier New",monospace}
      .small{font-size:15px;font-weight:700}
      .tiny{font-size:12px;font-weight:700}
      .micro{font-size:10px;font-weight:700}
      .heading{font-size:24px;font-weight:900}
      .name{font-size:20px;font-weight:900}
      .stamp{font-size:22px;font-weight:900}
    </style>
  </defs>
  <rect width="1080" height="1350" fill="#cfc49f"/>
  <rect x="${PAPER_X + 8}" y="${PAPER_Y + 10}" width="${PAPER_WIDTH}" height="${PAPER_HEIGHT}" fill="#6f653f" opacity="0.32"/>
  <rect x="${PAPER_X}" y="${PAPER_Y}" width="${PAPER_WIDTH}" height="${PAPER_HEIGHT}" fill="url(#paper)" stroke="#8f8257" stroke-width="2" filter="url(#paperNoise)"/>
  <rect x="${PAPER_X + 26}" y="${PAPER_Y + 26}" width="${PAPER_WIDTH - 52}" height="${PAPER_HEIGHT - 52}" fill="none" stroke="#82754d" stroke-width="1" opacity="0.55"/>
  ${tape(178, 30, -1.5)}
  ${tape(780, 31, 3)}
  ${stamp(792, 90, "TOP SECRET", -8)}
  <text x="116" y="116" class="muted tiny">OMNIVERSUS AGENCY // SIM-ID: ${escapeSvg(displayTitle(artifact.reportId).slice(0, 18))} // DATE: REDACTED</text>
  <text x="116" y="143" class="ink heading">${escapeSvg(artifact.title)}</text>
  <text x="116" y="166" class="red small">CLEARANCE LEVEL: OMEGA - AUTHORIZED PERSONNEL ONLY</text>
  <line x1="116" y1="190" x2="964" y2="190" stroke="#3d3422" stroke-width="3"/>
  ${subjectCard(116, 224, subjectA)}
  <text x="540" y="290" text-anchor="middle" class="ink heading">VS</text>
  ${subjectCard(590, 224, subjectB)}
  <text x="116" y="520" class="muted small">STATISTICAL COMPARISON</text>
  <line x1="116" y1="536" x2="964" y2="536" stroke="#8b7f56" stroke-width="1.4" stroke-dasharray="5 5"/>
  ${artifact.metrics.map((metric, index) => metricRow(metric, 568 + index * 34)).join("\n")}
  <text x="116" y="770" class="muted small">ABILITY INTERACTION LOG</text>
  <line x1="116" y1="786" x2="964" y2="786" stroke="#8b7f56" stroke-width="1.4" stroke-dasharray="5 5"/>
  ${artifact.logs.map((log, index) => logRow(log, 824 + index * 54)).join("\n")}
  <text x="116" y="1011" class="muted small">SIMULATION VERDICT</text>
  <rect x="116" y="1030" width="848" height="164" fill="none" stroke="#453c28" stroke-width="2"/>
  <text x="138" y="1072" class="ink heading">SUBJECT ${escapeSvg(winnerSubjectLabel(artifact))} - ${escapeSvg(displayVerdict(artifact.winner))}</text>
  <text x="138" y="1104" class="muted tiny">DIFFICULTY: ${escapeSvg(displayVerdict(artifact.difficulty))} // CONFIDENCE: ${artifact.confidence}% // OUTCOME: INCAPACITATION</text>
  <text x="138" y="1140" class="muted tiny">PRIMARY WIN CONDITION:</text>
  ${svgMultilineText(outcomeLines, 138, 1164, 20, "ink tiny")}
  ${confidenceBar(432, 1131, 430, artifact.confidence)}
  <text x="878" y="1143" class="ink tiny">${artifact.confidence}%</text>
  <text x="540" y="1244" text-anchor="middle" class="muted small">[ REPORT CARD READY FOR SOCIAL TRANSMISSION ]</text>
  ${stamp(96, 1224, artifact.classification, -5)}
  <text x="116" y="1280" class="muted tiny">OMNIVERSUS AGENCY // SIMULATION DIVISION</text>
  <text x="820" y="1280" class="muted tiny">DOC REF:</text>
  <rect x="894" y="1265" width="92" height="18" fill="#2e2115"/>
  <text x="904" y="1279" class="red micro">${escapeSvg(artifact.docRef)}</text>
  <text x="116" y="205" class="muted tiny">${escapeSvg(titleLines.join(" "))}</text>
</svg>`;
}

function subjectCard(x: number, y: number, subject: ArtifactSubject) {
  return `<g>
    <rect x="${x}" y="${y}" width="368" height="260" fill="none" stroke="#80744e" stroke-width="1.5"/>
    <rect x="${x + 24}" y="${y + 24}" width="104" height="132" fill="#c8bd95" stroke="#8a7e57" stroke-width="1.5"/>
    <rect x="${x + 59}" y="${y + 10}" width="33" height="23" fill="none" stroke="#80744e" stroke-width="1.5"/>
    <text x="${x + 76}" y="${y + 82}" text-anchor="middle" class="muted tiny">${escapeSvg(subject.initials)}</text>
    <text x="${x + 50}" y="${y + 103}" class="muted micro">PHOTO</text>
    <text x="${x + 50}" y="${y + 118}" class="muted micro">ATTACHED</text>
    <text x="${x + 24}" y="${y + 179}" class="ink name">${escapeSvg(truncate(displayTitle(subject.name), 24))}</text>
    <text x="${x + 24}" y="${y + 204}" class="muted tiny">TIER: ${escapeSvg(truncate(displayVerdict(subject.tier), 27))}</text>
    <text x="${x + 24}" y="${y + 225}" class="muted tiny">ORIGIN: ${escapeSvg(truncate(displayVerdict(subject.origin), 25))}</text>
    <text x="${x + 24}" y="${y + 246}" class="muted tiny">THREAT: ${escapeSvg(truncate(displayVerdict(subject.threat), 25))}</text>
  </g>`;
}

function metricRow(metric: ArtifactMetric, y: number) {
  return `<g>
    <text x="116" y="${y + 12}" class="muted tiny">${escapeSvg(truncate(metric.label, 22))}</text>
    ${metricBar(256, y, metric.aScore, "url(#greenInk)")}
    <text x="515" y="${y + 12}" text-anchor="end" class="ink tiny">${metric.aScore}</text>
    <path d="M 540 ${y + 3} L 548 ${y + 17} L 532 ${y + 17} Z" fill="#3b3423"/>
    ${metricBar(606, y, metric.bScore, "url(#brownInk)")}
    <text x="900" y="${y + 12}" text-anchor="end" class="ink tiny">${metric.bScore}</text>
    <text x="922" y="${y + 12}" class="${metric.contested ? "red" : "green"} micro">${escapeSvg(metric.contested ? "CONTESTED" : metric.winner)}</text>
  </g>`;
}

function metricBar(x: number, y: number, score: number, fill: string) {
  const width = 286;
  const scoreWidth = Math.round((width * clampScore(score)) / 100);

  return `<g>
    <rect x="${x}" y="${y}" width="${width}" height="16" fill="#b9ae86" stroke="#887b53" stroke-width="1"/>
    <rect x="${x}" y="${y}" width="${scoreWidth}" height="16" fill="${fill}"/>
    <path d="${Array.from({ length: 8 }, (_, index) => {
      const offset = x + index * 36;
      return `M ${offset} ${y} V ${y + 16}`;
    }).join(" ")}" stroke="#3b3423" stroke-opacity="0.18" stroke-width="1"/>
  </g>`;
}

function logRow(log: ArtifactLog, y: number) {
  const colorClass =
    log.tone === "danger" ? "red" : log.tone === "success" ? "green" : "ink";
  const lines = wrapText(log.value, 90, 2);

  return `<g>
    <line x1="116" y1="${y - 20}" x2="116" y2="${y + 24}" stroke="#574b31" stroke-width="2"/>
    <text x="134" y="${y}" class="ink tiny">${escapeSvg(log.label)} - </text>
    <text x="${134 + log.label.length * 8 + 26}" y="${y}" class="${colorClass} tiny">${escapeSvg(lines[0] ?? "N/A")}</text>
    ${lines[1] ? `<text x="134" y="${y + 22}" class="muted tiny">${escapeSvg(lines[1])}</text>` : ""}
  </g>`;
}

function confidenceBar(
  x: number,
  y: number,
  width: number,
  confidence: number,
) {
  const scoreWidth = Math.round((width * clampScore(confidence)) / 100);

  return `<g>
    <rect x="${x}" y="${y}" width="${width}" height="15" fill="#b9ae86" stroke="#887b53" stroke-width="1"/>
    <rect x="${x}" y="${y}" width="${scoreWidth}" height="15" fill="#897b54"/>
  </g>`;
}

function stamp(x: number, y: number, text: string, rotate: number) {
  const width = Math.max(156, text.length * 13);

  return `<g transform="translate(${x} ${y}) rotate(${rotate})">
    <rect x="0" y="0" width="${width}" height="46" fill="none" stroke="#a3443a" stroke-width="5"/>
    <text x="${width / 2}" y="31" text-anchor="middle" class="red stamp">${escapeSvg(displayVerdict(text))}</text>
  </g>`;
}

function tape(x: number, y: number, rotate: number) {
  return `<rect x="${x}" y="${y}" width="86" height="25" fill="#b8aa7b" opacity="0.42" stroke="#8f8257" stroke-width="1" transform="rotate(${rotate} ${x + 43} ${y + 12})"/>`;
}

function svgMultilineText(
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  className: string,
) {
  return `<text x="${x}" y="${y}" class="${className}">
    ${lines
      .slice(0, MAX_SHARE_LINES)
      .map(
        (line, index) =>
          `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeSvg(line)}</tspan>`,
      )
      .join("")}
  </text>`;
}

async function renderSvgToPngBlob(svgMarkup: string): Promise<Blob> {
  const svgBlob = new Blob([svgMarkup], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = ARTIFACT_WIDTH;
    canvas.height = ARTIFACT_HEIGHT;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");

    context.fillStyle = "#cfc49f";
    context.fillRect(0, 0, ARTIFACT_WIDTH, ARTIFACT_HEIGHT);
    context.drawImage(image, 0, 0, ARTIFACT_WIDTH, ARTIFACT_HEIGHT);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG export failed"));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("SVG image load failed"));
    image.src = url;
  });
}

function canShareFile(file: File) {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function shareFileName(artifact: ShareableArtifact) {
  const subjectNames = artifact.subjects
    .map((subject) => subject.name)
    .join("-vs-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return `omniversus-${subjectNames || "battle-report"}.png`;
}

function winnerSubjectLabel(artifact: ShareableArtifact) {
  if (artifact.winnerSide === "A" || artifact.winnerSide === "B") {
    return artifact.winnerSide;
  }

  const winnerName = artifact.winner.toLowerCase();
  const winnerSubject = artifact.subjects.find((subject) =>
    winnerName.includes(subject.name.toLowerCase()),
  );

  return winnerSubject?.side ?? "A";
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

function wrapText(text: unknown, maxChars: number, maxLines: number) {
  const words = valueText(text).replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxChars) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) lines.push(currentLine);
    currentLine =
      word.length > maxChars ? `${word.slice(0, maxChars - 1)}-` : word;

    if (lines.length >= maxLines) break;
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine);

  if (lines.length > maxLines) return lines.slice(0, maxLines);

  const hadOverflow = words.join(" ").length > lines.join(" ").length;
  if (hadOverflow && lines.length) {
    lines[lines.length - 1] =
      `${lines[lines.length - 1].slice(0, maxChars - 3)}...`;
  }

  return lines.length ? lines : ["N/A"];
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength - 3)}...`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
