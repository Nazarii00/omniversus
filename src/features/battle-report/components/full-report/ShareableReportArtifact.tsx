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
    title: "VERDICT FIELD SHEET",
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
  const summaryLines = wrapText(artifact.summary, 74, 3);
  const outcomeLines = wrapText(artifact.outcome, 82, 3);
  const reportSerial = escapeSvg(displayTitle(artifact.reportId).slice(0, 22));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${ARTIFACT_WIDTH}" height="${ARTIFACT_HEIGHT}" viewBox="0 0 ${ARTIFACT_WIDTH} ${ARTIFACT_HEIGHT}" role="img" aria-label="${escapeSvg(`${subjectA.name} versus ${subjectB.name} paper simulation report`)}">
  <defs>
    <filter id="paperNoise" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="4" seed="13" result="noise" />
      <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
      <feComponentTransfer in="mono" result="softNoise">
        <feFuncA type="table" tableValues="0 0.12" />
      </feComponentTransfer>
      <feBlend in="SourceGraphic" in2="softNoise" mode="multiply" />
    </filter>
    <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#f0e6bf" />
      <stop offset="0.52" stop-color="#d9cfaa" />
      <stop offset="1" stop-color="#c4b88f" />
    </linearGradient>
    <linearGradient id="greenInk" x1="0" x2="1">
      <stop offset="0" stop-color="#264f35" />
      <stop offset="1" stop-color="#6d7e4d" />
    </linearGradient>
    <linearGradient id="brownInk" x1="0" x2="1">
      <stop offset="0" stop-color="#31271a" />
      <stop offset="1" stop-color="#78643c" />
    </linearGradient>
    <style>
      .ink{fill:#352f22;font-family:"Courier New",monospace}
      .muted{fill:#756c4d;font-family:"Courier New",monospace}
      .faint{fill:#938765;font-family:"Courier New",monospace}
      .red{fill:#9b302f;font-family:"Courier New",monospace}
      .green{fill:#225b35;font-family:"Courier New",monospace}
      .small{font-size:15px;font-weight:700}
      .tiny{font-size:12px;font-weight:700}
      .micro{font-size:10px;font-weight:700}
      .heading{font-size:23px;font-weight:900;letter-spacing:1.5px}
      .title{font-size:31px;font-weight:900;letter-spacing:2px}
      .name{font-size:18px;font-weight:900;letter-spacing:.8px}
      .stamp{font-size:21px;font-weight:900;letter-spacing:2px}
      .watermarkText{fill:#6b5d38;font-family:"Courier New",monospace;font-size:28px;font-weight:900;letter-spacing:5px}
    </style>
  </defs>
  <rect width="1080" height="1350" fill="#bfb38e"/>
  <rect x="0" y="0" width="1080" height="1350" fill="url(#paper)" opacity="0.22"/>
  <rect x="${PAPER_X + 14}" y="${PAPER_Y + 16}" width="${PAPER_WIDTH}" height="${PAPER_HEIGHT}" fill="#5e5334" opacity="0.28"/>
  <rect x="${PAPER_X}" y="${PAPER_Y}" width="${PAPER_WIDTH}" height="${PAPER_HEIGHT}" fill="url(#paper)" stroke="#8b7e55" stroke-width="2" filter="url(#paperNoise)"/>
  <path d="M ${PAPER_X + 28} ${PAPER_Y + 26} H ${PAPER_X + PAPER_WIDTH - 28} V ${PAPER_Y + PAPER_HEIGHT - 28} H ${PAPER_X + 28} Z" fill="none" stroke="#837550" stroke-width="1" opacity="0.5"/>
  <path d="M 92 92 H 988 M 92 1256 H 988" stroke="#8c805a" stroke-width="1" stroke-dasharray="7 7" opacity="0.5"/>
  ${tape(144, 28, -2)}
  ${tape(806, 33, 2.4)}
  ${agencyWatermark(540, 720, 1.08, -7, 0.16)}
  ${agencyWatermark(128, 128, 0.18, 0, 0.52)}
  <text x="188" y="104" class="muted tiny">OMNIVERSUS INTERVENTION OFFICE // PUBLIC TRANSMISSION ARTIFACT</text>
  <text x="188" y="134" class="ink title">VERDICT FIELD SHEET</text>
  <text x="188" y="163" class="red small">SANITIZED EXCERPT // SIMULATION EVIDENCE SUMMARY // NO CANON AUTHORITY IMPLIED</text>
  <text x="805" y="116" class="muted micro">SIM-ID</text>
  <rect x="804" y="126" width="160" height="20" fill="#2f2418"/>
  <text x="814" y="141" class="red micro">${reportSerial}</text>
  ${stamp(760, 166, artifact.classification, -4)}
  <line x1="116" y1="196" x2="964" y2="196" stroke="#3d3424" stroke-width="3"/>

  <rect x="116" y="220" width="848" height="106" fill="#d5c99f" opacity="0.62" stroke="#80734d" stroke-width="1.5"/>
  <text x="138" y="248" class="muted small">TRANSMISSION ABSTRACT</text>
  ${svgMultilineText(summaryLines, 138, 278, 20, "ink tiny")}
  <rect x="848" y="238" width="94" height="18" fill="#2f2418"/>
  <rect x="848" y="264" width="72" height="18" fill="#2f2418"/>

  ${subjectCard(116, 362, subjectA)}
  ${versusSeal(540, 454)}
  ${subjectCard(572, 362, subjectB)}

  <text x="116" y="612" class="muted small">CAPABILITY LEDGER</text>
  <line x1="116" y1="630" x2="964" y2="630" stroke="#837550" stroke-width="1.4"/>
  ${artifact.metrics.map((metric, index) => metricRow(metric, 656 + index * 32)).join("\n")}

  <text x="116" y="858" class="muted small">DECISIVE CHAIN EXCERPT</text>
  <line x1="116" y1="876" x2="964" y2="876" stroke="#837550" stroke-width="1.4"/>
  ${artifact.logs.map((log, index) => logRow(log, 916 + index * 68)).join("\n")}

  <text x="116" y="1110" class="muted small">VERDICT MEMO</text>
  <rect x="116" y="1130" width="848" height="136" fill="#d5c99f" opacity="0.58" stroke="#453c28" stroke-width="2"/>
  <text x="138" y="1164" class="ink heading">SUBJECT ${escapeSvg(winnerSubjectLabel(artifact))} PREVAILS // ${escapeSvg(displayVerdict(artifact.winner))}</text>
  <text x="138" y="1193" class="muted tiny">DIFFICULTY: ${escapeSvg(displayVerdict(artifact.difficulty))} // OUTCOME ROUTE: INCAPACITATION // CONFIDENCE INDEX: ${artifact.confidence}%</text>
  ${svgMultilineText(outcomeLines, 138, 1220, 18, "ink tiny")}
  ${confidenceBar(700, 1210, 210, artifact.confidence)}
  <text x="922" y="1222" class="ink tiny">${artifact.confidence}%</text>

  <text x="540" y="1285" text-anchor="middle" class="muted small">[ PNG ARTIFACT READY FOR SOCIAL TRANSMISSION ]</text>
  <text x="116" y="1310" class="muted tiny">OMNIVERSUS // SIMULATION DIVISION // DOC REF ${escapeSvg(artifact.docRef)}</text>
  <text x="805" y="1310" class="muted tiny">EXPORT: SHAREABLE PAPER REPORT</text>
</svg>`;
}

function subjectCard(x: number, y: number, subject: ArtifactSubject) {
  return `<g>
    <rect x="${x}" y="${y}" width="392" height="202" fill="#d5c99f" opacity="0.44" stroke="#80744e" stroke-width="1.5"/>
    <path d="M ${x + 18} ${y + 18} H ${x + 112} V ${y + 112} H ${x + 18} Z" fill="none" stroke="#8a7e57" stroke-width="1.5"/>
    <circle cx="${x + 65}" cy="${y + 65}" r="32" fill="none" stroke="#756a48" stroke-width="2"/>
    <path d="M ${x + 65} ${y + 37} L ${x + 75} ${y + 65} L ${x + 65} ${y + 93} L ${x + 55} ${y + 65} Z" fill="#756a48" opacity="0.22"/>
    <text x="${x + 65}" y="${y + 71}" text-anchor="middle" class="ink heading">${escapeSvg(subject.initials)}</text>
    <text x="${x + 136}" y="${y + 33}" class="muted tiny">SUBJECT ${subject.side} // IDENTITY CHIT</text>
    <text x="${x + 136}" y="${y + 65}" class="ink name">${escapeSvg(truncate(displayTitle(subject.name), 25))}</text>
    <text x="${x + 136}" y="${y + 92}" class="muted tiny">TIER: ${escapeSvg(truncate(displayVerdict(subject.tier), 31))}</text>
    <text x="${x + 136}" y="${y + 115}" class="muted tiny">ORIGIN: ${escapeSvg(truncate(displayVerdict(subject.origin), 30))}</text>
    <text x="${x + 18}" y="${y + 148}" class="muted micro">PROFILE TRACE</text>
    ${svgMultilineText(wrapText(subject.profile, 48, 2), x + 18, y + 169, 18, "ink tiny")}
  </g>`;
}

function metricRow(metric: ArtifactMetric, y: number) {
  return `<g>
    <text x="132" y="${y + 12}" class="muted tiny">${escapeSvg(truncate(metric.label, 22))}</text>
    ${metricBar(304, y, 220, metric.aScore, "url(#greenInk)")}
    <text x="542" y="${y + 12}" text-anchor="end" class="ink tiny">${metric.aScore}</text>
    <line x1="560" y1="${y - 4}" x2="560" y2="${y + 20}" stroke="#817550" stroke-width="1"/>
    ${metricBar(590, y, 220, metric.bScore, "url(#brownInk)")}
    <text x="828" y="${y + 12}" text-anchor="end" class="ink tiny">${metric.bScore}</text>
    <text x="854" y="${y + 12}" class="${metric.contested ? "red" : "green"} micro">${escapeSvg(metric.contested ? "CONTESTED" : metric.winner)}</text>
  </g>`;
}

function metricBar(
  x: number,
  y: number,
  width: number,
  score: number,
  fill: string,
) {
  const scoreWidth = Math.round((width * clampScore(score)) / 100);

  return `<g>
    <rect x="${x}" y="${y}" width="${width}" height="15" fill="#b9ae86" stroke="#887b53" stroke-width="1"/>
    <rect x="${x}" y="${y}" width="${scoreWidth}" height="15" fill="${fill}"/>
    <path d="${Array.from({ length: 7 }, (_, index) => {
      const offset = x + index * 36;
      return `M ${offset} ${y} V ${y + 15}`;
    }).join(" ")}" stroke="#3b3423" stroke-opacity="0.18" stroke-width="1"/>
  </g>`;
}

function logRow(log: ArtifactLog, y: number) {
  const colorClass =
    log.tone === "danger" ? "red" : log.tone === "success" ? "green" : "ink";
  const lines = wrapText(log.value, 82, 2);

  return `<g>
    <rect x="116" y="${y - 28}" width="848" height="62" fill="#d5c99f" opacity="0.34" stroke="#8b7f56" stroke-width="1"/>
    <line x1="132" y1="${y - 18}" x2="132" y2="${y + 14}" stroke="#574b31" stroke-width="2"/>
    <text x="150" y="${y - 5}" class="${colorClass} tiny">${escapeSvg(log.label)}</text>
    <text x="150" y="${y + 15}" class="ink tiny">${escapeSvg(lines[0] ?? "N/A")}</text>
    ${lines[1] ? `<text x="150" y="${y + 34}" class="muted tiny">${escapeSvg(lines[1])}</text>` : ""}
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
    <rect x="${x}" y="${y}" width="${width}" height="14" fill="#b9ae86" stroke="#887b53" stroke-width="1"/>
    <rect x="${x}" y="${y}" width="${scoreWidth}" height="14" fill="#897b54"/>
  </g>`;
}

function stamp(x: number, y: number, text: string, rotate: number) {
  const width = Math.max(174, text.length * 12);

  return `<g transform="translate(${x} ${y}) rotate(${rotate})">
    <rect x="0" y="0" width="${width}" height="44" fill="none" stroke="#a3443a" stroke-width="3" stroke-dasharray="9 5"/>
    <rect x="7" y="7" width="${width - 14}" height="30" fill="none" stroke="#a3443a" stroke-width="1.4"/>
    <text x="${width / 2}" y="29" text-anchor="middle" class="red stamp">${escapeSvg(displayVerdict(text))}</text>
  </g>`;
}

function tape(x: number, y: number, rotate: number) {
  return `<rect x="${x}" y="${y}" width="86" height="25" fill="#b8aa7b" opacity="0.42" stroke="#8f8257" stroke-width="1" transform="rotate(${rotate} ${x + 43} ${y + 12})"/>`;
}

function versusSeal(x: number, y: number) {
  return `<g transform="translate(${x} ${y})">
    <circle r="43" fill="#d5c99f" stroke="#756a48" stroke-width="2"/>
    <circle r="30" fill="none" stroke="#756a48" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="0" y="-4" text-anchor="middle" class="ink heading">VS</text>
    <text x="0" y="20" text-anchor="middle" class="muted micro">SIM LOCK</text>
  </g>`;
}

function agencyWatermark(
  x: number,
  y: number,
  scale: number,
  rotate: number,
  opacity: number,
) {
  return `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})" opacity="${opacity}">
    <g fill="none" stroke="#6b5d38" stroke-width="5">
      <circle r="212"/>
      <circle r="162"/>
      <path d="M -188 0 C -118 -84 118 -84 188 0 C 118 84 -118 84 -188 0 Z"/>
      <circle r="58"/>
      <circle r="24"/>
      <path d="M 0 -212 V 212 M -212 0 H 212"/>
      <path d="M -122 -158 C -48 -52 -48 52 -122 158"/>
      <path d="M 122 -158 C 48 -52 48 52 122 158"/>
      <path d="M -162 -92 C -58 -48 58 -48 162 -92"/>
      <path d="M -162 92 C -58 48 58 48 162 92"/>
    </g>
    <g fill="#6b5d38">
      <path d="M 0 -264 L 12 -232 L 0 -200 L -12 -232 Z"/>
      <path d="M 0 264 L 12 232 L 0 200 L -12 232 Z"/>
      <path d="M -264 0 L -232 -12 L -200 0 L -232 12 Z"/>
      <path d="M 264 0 L 232 -12 L 200 0 L 232 12 Z"/>
    </g>
    <text x="0" y="292" text-anchor="middle" class="watermarkText">OMNIVERSUS</text>
  </g>`;
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
