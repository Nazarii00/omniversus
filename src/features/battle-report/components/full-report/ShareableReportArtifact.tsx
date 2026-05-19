"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  displayTitle,
  displayVerdict,
  formatSide,
  valueText,
  type BattleReportJson,
  type ReportArgumentChain,
  type ReportComparisonRow,
  type ReportFighter,
  type ReportViewModel,
} from "../../model";
import styles from "./FullBattleReportPage.module.css";

const ARTIFACT_WIDTH = 1080;
const ARTIFACT_HEIGHT = 1350;
const MAX_SHARE_LINES = 4;
const CLASSIFIED_PAPER_ASSET = "/assets/battle-report/classified-paper.png";
const DECLASSIFIED_STAMP_ASSET =
  "/assets/battle-report/declassified-stamp.png";
const EVIDENCE_PHOTO_FRAME_ASSET =
  "/assets/battle-report/evidence-photo-frame.png";
const MASKING_TAPE_ASSET = "/assets/battle-report/masking-tape.png";

let shareableArtifactAssetsPromise: Promise<ShareableArtifactAssets> | null =
  null;

type ReportWinCondition =
  NonNullable<BattleReportJson["win_conditions"]>[number];

type ShareableReportActionsProps = {
  abilityInteractions?: BattleReportJson["ability_interactions"];
  comparison: ReportComparisonRow[];
  dataProvenance?: BattleReportJson["data_provenance"];
  decisiveChain: ReportArgumentChain | null;
  hasStoredReport: boolean;
  reportMetadata?: BattleReportJson["metadata"];
  reportRules?: BattleReportJson["rules"];
  summary: string;
  view: ReportViewModel;
  winConditions?: BattleReportJson["win_conditions"];
};

type ArtifactSubject = {
  constraint: string;
  initials: string;
  name: string;
  origin: string;
  profile: string;
  side: "A" | "B";
  tier: string;
};

type ArtifactMetric = {
  assessment: string;
  countermeasure: string;
  contested: boolean;
  label: string;
  weight: string;
};

type ArtifactLog = {
  label: string;
  tone: "normal" | "danger" | "success";
  value: string;
};

type ArtifactAssumption = {
  label: string;
  value: string;
};

type ShareableArtifact = {
  assumptions: ArtifactAssumption[];
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

type ShareableArtifactAssets = {
  frame: string;
  paper: string;
  stamp: string;
  tape: string;
};

type ExportStatus = {
  tone: "ok" | "error" | "idle";
  text: string;
};

type SharePreview = {
  artifact: ShareableArtifact;
  blob: Blob;
  file: File;
  fileName: string;
  imageUrl: string;
  pageUrl: string;
  shareText: string;
  shareTitle: string;
};

export function ShareableReportActions({
  abilityInteractions,
  comparison,
  dataProvenance,
  decisiveChain,
  hasStoredReport,
  reportMetadata,
  reportRules,
  summary,
  view,
  winConditions,
}: ShareableReportActionsProps) {
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<SharePreview | null>(null);
  const [status, setStatus] = useState<ExportStatus>({
    tone: "idle",
    text: "",
  });

  useEffect(() => {
    if (!isPreviewOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closePreview();
    }

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isPreviewOpen]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.imageUrl);
    };
  }, [preview]);

  async function openPreview() {
    setIsPreparing(true);
    setIsPreviewOpen(true);
    setStatus({ tone: "idle", text: "" });
    setPreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview.imageUrl);
      return null;
    });

    try {
      const artifact = buildShareableArtifact({
        abilityInteractions,
        comparison,
        dataProvenance,
        decisiveChain,
        hasStoredReport,
        reportMetadata,
        reportRules,
        summary,
        view,
        winConditions,
      });
      const assets = await loadShareableArtifactAssets();
      const svgMarkup = renderShareableReportSvg(artifact, assets);
      const fileName = shareFileName(artifact);
      const blob = await renderSvgToPngBlob(svgMarkup);
      const file = new File([blob], fileName, { type: "image/png" });
      const imageUrl = URL.createObjectURL(blob);
      const nextPreview: SharePreview = {
        artifact,
        blob,
        file,
        fileName,
        imageUrl,
        pageUrl: currentReportUrl(),
        shareText: shareText(artifact),
        shareTitle: shareTitle(artifact),
      };

      setPreview((currentPreview) => {
        if (currentPreview) URL.revokeObjectURL(currentPreview.imageUrl);
        return nextPreview;
      });
      setIsPreviewOpen(true);
    } catch (error) {
      if (isShareAbortError(error)) {
        setStatus({ tone: "idle", text: "" });
        return;
      }

      setStatus({
        tone: "error",
        text: "PREVIEW FAILED - TRY AGAIN",
      });
    } finally {
      setIsPreparing(false);
    }
  }

  function closePreview() {
    setIsPreviewOpen(false);
    setPreview((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview.imageUrl);
      return null;
    });
  }

  async function copyReportLink() {
    if (!preview) return;

    try {
      await copyText(preview.pageUrl);
      setStatus({ tone: "ok", text: "LINK COPIED" });
    } catch {
      setStatus({ tone: "error", text: "COPY FAILED" });
    }
  }

  async function shareReportLink() {
    if (!preview) return;

    setIsSharing(true);
    setStatus({ tone: "idle", text: "" });

    try {
      if (canUseNativeShare()) {
        await navigator.share({
          text: preview.shareText,
          title: preview.shareTitle,
          url: preview.pageUrl,
        });
        setStatus({ tone: "ok", text: "SHARE SHEET OPENED" });
        return;
      }

      await copyText(preview.pageUrl);
      setStatus({ tone: "ok", text: "LINK COPIED" });
    } catch (error) {
      if (isShareAbortError(error)) {
        setStatus({ tone: "idle", text: "" });
        return;
      }

      setStatus({ tone: "error", text: "SHARE FAILED" });
    } finally {
      setIsSharing(false);
    }
  }

  async function shareArtifactPng() {
    if (!preview) return;

    setIsSharing(true);
    setStatus({ tone: "idle", text: "" });

    try {
      if (canShareFile(preview.file)) {
        await navigator.share({
          files: [preview.file],
          text: preview.shareText,
          title: preview.shareTitle,
        });
        setStatus({ tone: "ok", text: "PNG SHARE SHEET OPENED" });
        return;
      }

      downloadBlob(preview.blob, preview.fileName);
      setStatus({ tone: "ok", text: "PNG DOWNLOADED" });
    } catch (error) {
      if (isShareAbortError(error)) {
        setStatus({ tone: "idle", text: "" });
        return;
      }

      setStatus({ tone: "error", text: "PNG SHARE FAILED" });
    } finally {
      setIsSharing(false);
    }
  }

  function downloadPreviewPng() {
    if (!preview) return;

    downloadBlob(preview.blob, preview.fileName);
    setStatus({ tone: "ok", text: "PNG DOWNLOADED" });
  }

  const previewDialog =
    typeof document !== "undefined" && isPreviewOpen
      ? createPortal(
          <SharePreviewDialog
            isSharing={isSharing}
            onClose={closePreview}
            onCopyLink={() => void copyReportLink()}
            onDownloadPng={downloadPreviewPng}
            onShareLink={() => void shareReportLink()}
            onSharePng={() => void shareArtifactPng()}
            preview={preview}
            status={status}
          />,
          document.body,
        )
      : null;

  return (
    <div className={styles.shareReportActions}>
      <button
        type="button"
        aria-busy={isPreparing}
        disabled={isPreparing}
        onClick={() => void openPreview()}
      >
        Share
      </button>
      {previewDialog}
    </div>
  );
}

function SharePreviewDialog({
  isSharing,
  onClose,
  onCopyLink,
  onDownloadPng,
  onShareLink,
  onSharePng,
  preview,
  status,
}: {
  isSharing: boolean;
  onClose: () => void;
  onCopyLink: () => void;
  onDownloadPng: () => void;
  onShareLink: () => void;
  onSharePng: () => void;
  preview: SharePreview | null;
  status: ExportStatus;
}) {
  return (
    <div
      className={styles.sharePreviewBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.sharePreviewDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-preview-title"
      >
        <header className={styles.sharePreviewHeader}>
          <div className={styles.sharePreviewHeading}>
            <span>Share</span>
            <h2 id="share-preview-title">Artifact Preview</h2>
            <p>{preview ? caseCaption(preview.artifact) : "Preparing"}</p>
          </div>
          <button
            className={styles.sharePreviewClose}
            type="button"
            onClick={onClose}
            aria-label="Close share preview"
          >
            X
          </button>
        </header>
        <div className={styles.sharePreviewBody}>
          <div className={styles.sharePreviewStage}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- Blob previews are generated client-side.
              <img
                className={styles.sharePreviewImage}
                src={preview.imageUrl}
                alt={`${preview.shareTitle} artifact preview`}
              />
            ) : (
              <span className={styles.sharePreviewLoading}>
                Preparing preview
              </span>
            )}
          </div>
          <form
            className={styles.sharePreviewForm}
            onSubmit={(event) => {
              event.preventDefault();
              onShareLink();
            }}
          >
            <label className={styles.sharePreviewLabel} htmlFor="share-url">
              Report Link
            </label>
            <div className={styles.sharePreviewLinkRow}>
              <input
                id="share-url"
                readOnly
                value={preview?.pageUrl ?? ""}
                aria-label="Report link"
              />
              <button
                type="button"
                disabled={!preview || isSharing}
                onClick={onCopyLink}
              >
                Copy
              </button>
            </div>
            <div className={styles.sharePreviewActions}>
              <button type="submit" disabled={!preview || isSharing}>
                Share
              </button>
              <button
                type="button"
                disabled={!preview || isSharing}
                onClick={onSharePng}
              >
                Share PNG
              </button>
              <button
                type="button"
                disabled={!preview || isSharing}
                onClick={onDownloadPng}
              >
                Download PNG
              </button>
            </div>
            {status.text ? (
              <p
                className={styles.sharePreviewStatus}
                data-tone={status.tone}
                role={status.tone === "error" ? "alert" : "status"}
              >
                {status.text}
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </div>
  );
}

function buildShareableArtifact({
  abilityInteractions,
  comparison,
  dataProvenance,
  decisiveChain,
  hasStoredReport,
  reportMetadata,
  reportRules,
  summary,
  view,
  winConditions,
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
  const decisiveWinCondition = pickWinCondition(
    winConditions,
    view.verdict.winner_side,
  );
  const opposingWinCondition = pickOpposingWinCondition(
    winConditions,
    view.verdict.winner_side,
  );
  const logs = [
    {
      label: "DECISIVE ROUTE",
      tone: "danger" as const,
      value:
        decisiveChain?.conclusion ??
        decisiveWinCondition?.method ??
        view.verdict.primary_reason ??
        view.chainTeaser,
    },
    {
      label: "FAILED COUNTER-ROUTE",
      tone: "success" as const,
      value:
        view.verdict.why_not_other_side ??
        view.verdict.loser_best_argument ??
        opposingWinCondition?.blocked_by,
    },
    {
      label: "REVERSAL CONDITION",
      tone: "normal" as const,
      value:
        view.verdict.flip_condition ??
        decisiveChain?.breaks_if ??
        decisiveWinCondition?.blocked_by,
    },
  ];

  return {
    assumptions: buildArtifactAssumptions({
      dataProvenance,
      hasStoredReport,
      reportMetadata,
      reportRules,
    }),
    classification: hasStoredReport ? "PUBLIC REDACTION" : "SPECIMEN",
    confidence: view.confidence,
    difficulty: view.difficulty,
    docRef: docRef(view.id),
    logs: logs.map((log) => ({
      ...log,
      value: valueText(log.value),
    })),
    metrics: buildArtifactMetrics({
      abilityInteractions,
      comparison,
      decisiveChain,
      fighters: view.fighters,
      view,
    }),
    outcome:
      view.verdict.primary_reason ??
      decisiveChain?.conclusion ??
      decisiveWinCondition?.method ??
      view.chainTeaser,
    reportId: view.id,
    summary,
    subjects,
    title: "OMNIVERSUS CLASSIFIED DOSSIER",
    winner,
    winnerSide: view.verdict.winner_side,
  };
}

function buildSubject(
  fighter: ReportFighter | undefined,
  side: "A" | "B",
): ArtifactSubject {
  const name = fighter?.name ?? `Subject ${side}`;
  const origin = subjectOrigin(fighter);
  const profile = firstReadableText(
    fighter?.profile?.win_conditions?.[0],
    fighter?.best_argument,
    fighter?.profile?.abilities,
    fighter?.tier?.basis,
  );
  const constraint = firstReadableText(
    fighter?.profile?.weaknesses?.[0],
    fighter?.weakest_argument,
    fighter?.profile?.lose_conditions?.[0],
    fighter?.tier?.basis,
  );

  return {
    constraint: valueText(constraint),
    initials: initialsFor(name || side),
    name,
    origin: valueText(origin),
    profile: valueText(profile),
    side,
    tier: valueText(fighter?.tier?.rating),
  };
}

function buildArtifactMetrics({
  abilityInteractions,
  comparison,
  decisiveChain,
  fighters,
  view,
}: {
  abilityInteractions?: BattleReportJson["ability_interactions"];
  comparison: ReportComparisonRow[];
  decisiveChain: ReportArgumentChain | null;
  fighters: ReportFighter[];
  view: ReportViewModel;
}): ArtifactMetric[] {
  if (abilityInteractions?.length) {
    return abilityInteractions.slice(0, 4).map((interaction) => {
      const attacker = subjectSideLabel(interaction.attacker, fighters);
      const defender = subjectSideLabel(interaction.defender, fighters);
      const route = displayVerdict(interaction.ability_type ?? "ABILITY");
      const effective = displayVerdict(interaction.effective ?? "FILED");
      const assessment = firstReadableText(
        interaction.reason,
        interaction.relevance_to_win_condition,
        interaction.activation,
      );
      const countermeasure = firstReadableText(
        interaction.defender_resistance,
        interaction.counterplay,
        interaction.resistance_basis,
        interaction.structurally_similar_resistance,
      );

      return {
        assessment: `${effective}: ${valueText(assessment)}`,
        contested: Boolean(interaction.contested),
        countermeasure: valueText(countermeasure),
        label: `${attacker}->${defender} ${route}`,
        weight: interaction.contested
          ? `DISPUTED / ${displayVerdict(interaction.impact ?? "FILED")}`
          : displayVerdict(interaction.impact ?? "FILED"),
      };
    });
  }

  const fallbackRows: ReportComparisonRow[] = [
    {
      category: "WIN_CONDITION",
      reason:
        decisiveChain?.conclusion ??
        view.verdict.primary_reason ??
        view.chainTeaser,
      winner: view.verdict.winner_side,
      margin: "DECISIVE",
      contested: Boolean(decisiveChain?.contested),
    },
    {
      category: "RESISTANCE",
      reason:
        view.verdict.why_not_other_side ??
        view.verdict.loser_best_argument ??
        "Opposing route remains filed for manual review.",
      winner: view.verdict.winner_side,
      margin: "MEDIUM",
      contested: Boolean(decisiveChain?.contested),
    },
    {
      category: "CONSENSUS",
      reason:
        view.verdict.flip_condition ??
        decisiveChain?.breaks_if ??
        "Result changes if the decisive route is invalidated.",
      winner: "TIE",
      margin: "SMALL",
      contested: true,
    },
  ];
  const sourceRows = comparison.length ? comparison : fallbackRows;

  return sourceRows.slice(0, 4).map((row) => {
    const winner =
      row.winner === "A" || row.winner === "B"
        ? subjectSideLabel(row.winner, fighters)
        : displayVerdict(row.winner ?? "TIE");
    const margin = valueText(row.margin);

    return {
      assessment:
        margin === "N/A"
          ? winner
          : `${winner} / ${displayVerdict(margin)}`,
      contested: Boolean(row.contested),
      countermeasure: valueText(row.reason),
      label: displayVerdict(row.category),
      weight: row.contested
        ? `CONTESTED / ${displayVerdict(margin === "N/A" ? "FILED" : margin)}`
        : displayVerdict(margin === "N/A" ? "FILED" : margin),
    };
  });
}

function buildArtifactAssumptions({
  dataProvenance,
  hasStoredReport,
  reportMetadata,
  reportRules,
}: Pick<
  ShareableReportActionsProps,
  "dataProvenance" | "hasStoredReport" | "reportMetadata" | "reportRules"
>): ArtifactAssumption[] {
  const canonScope = joinReadable(
    [
      reportMetadata?.battle_type,
      reportMetadata?.canon_scope,
      reportRules?.assumption_set,
    ],
    " / ",
  );
  const arenaRules = joinReadable(
    [
      reportRules?.location ? `Location: ${reportRules.location}` : null,
      reportRules?.starting_distance
        ? `Distance: ${reportRules.starting_distance}`
        : null,
      reportRules?.equipment ? `Equipment: ${reportRules.equipment}` : null,
    ],
    "; ",
  );
  const prepRules = joinReadable(
    [
      reportRules?.prep_time ? `Prep: ${reportRules.prep_time}` : null,
      reportRules?.prior_knowledge
        ? `Prior knowledge: ${reportRules.prior_knowledge}`
        : null,
      reportRules?.verse_equalization
        ? `Verse equalization: ${reportRules.verse_equalization}`
        : null,
    ],
    "; ",
  );
  const provenance = joinReadable(
    [
      dataProvenance?.mode,
      dataProvenance?.summary,
      dataProvenance?.needs_manual_review ? "manual review flagged" : null,
    ],
    " - ",
  );

  return [
    {
      label: "Filed rules baseline",
      value: firstReadableText(
        reportMetadata?.assumptions,
        reportRules?.rule_notes,
        "Standard battle assumptions unless the arena file overrides them.",
      ),
    },
    {
      label: "Canon and battle type",
      value: firstReadableText(canonScope, "Objective combat file."),
    },
    {
      label: "Arena conditions",
      value: firstReadableText(arenaRules, "No special arena condition filed."),
    },
    {
      label: "Prep and knowledge",
      value: firstReadableText(prepRules, "No prep or prior knowledge filed."),
    },
    {
      label: "Speed handling",
      value: speedAssumption(
        reportMetadata?.speed_equalized ?? reportRules?.speed_equalized,
      ),
    },
    {
      label: "Data status",
      value: firstReadableText(
        provenance,
        hasStoredReport
          ? "Session verdict loaded from arena result."
          : "Archive specimen loaded until a live verdict is filed.",
      ),
    },
  ];
}

function pickWinCondition(
  winConditions: BattleReportJson["win_conditions"],
  side: string | undefined,
): ReportWinCondition | undefined {
  const normalizedSide = side?.toUpperCase();

  if (normalizedSide === "A" || normalizedSide === "B") {
    return winConditions?.find((condition) => condition.side === normalizedSide);
  }

  return winConditions?.[0];
}

function pickOpposingWinCondition(
  winConditions: BattleReportJson["win_conditions"],
  winnerSide: string | undefined,
): ReportWinCondition | undefined {
  const normalizedSide = winnerSide?.toUpperCase();

  if (normalizedSide !== "A" && normalizedSide !== "B") {
    return winConditions?.[1] ?? winConditions?.[0];
  }

  return winConditions?.find((condition) => condition.side !== normalizedSide);
}

function subjectOrigin(fighter: ReportFighter | undefined) {
  const fullTitle = firstReadableText(
    fighter?.origin?.full_title,
    fighter?.verse,
    fighter?.origin?.abbreviation,
  );
  const continuity = firstReadableText(fighter?.origin?.continuity);

  if (fullTitle !== "N/A" && continuity !== "N/A" && continuity !== fullTitle) {
    return `${fullTitle} (${continuity})`;
  }

  return fullTitle;
}

function subjectSideLabel(side: string | undefined, fighters: ReportFighter[]) {
  if (side !== "A" && side !== "B") return displayVerdict(side ?? "SYSTEM");

  const fighter = fighters.find((item) => item.side === side);

  return fighter ? `SUBJ ${side}` : `SUBJ ${side}`;
}

function joinReadable(values: unknown[], separator: string) {
  const parts = values
    .map((value) => firstReadableText(value))
    .filter((value) => value !== "N/A");

  return parts.length ? parts.join(separator) : "N/A";
}

function firstReadableText(...values: unknown[]) {
  for (const value of values) {
    const text = valueText(value).replace(/\s+/g, " ").trim();

    if (!text || text === "N/A" || /^unknown$/i.test(text)) continue;

    return text;
  }

  return "N/A";
}

function speedAssumption(speedEqualized: boolean | undefined) {
  if (speedEqualized === true) {
    return "Speed is equalized; timing still matters for activation, range, and win-route access.";
  }

  if (speedEqualized === false) {
    return "Speed is not equalized; initiative, activation timing, and travel time remain live factors.";
  }

  return "Speed policy not filed; route timing should be treated as provisional.";
}

function renderShareableReportSvg(
  artifact: ShareableArtifact,
  assets: ShareableArtifactAssets,
) {
  const subjectA = artifact.subjects[0];
  const subjectB = artifact.subjects[1];
  const reportSerial = escapeSvg(displayTitle(artifact.reportId).slice(0, 22));
  const outcome = truncate(certifiedOutcome(artifact), 38);
  const reasonLines = wrapText(
    artifact.summary === "N/A" ? artifact.outcome : artifact.summary,
    68,
    2,
  );
  const status = artifact.classification;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${ARTIFACT_WIDTH}" height="${ARTIFACT_HEIGHT}" viewBox="0 0 ${ARTIFACT_WIDTH} ${ARTIFACT_HEIGHT}" role="img" aria-label="${escapeSvg(`${subjectA.name} versus ${subjectB.name} paper simulation report`)}">
  <defs>
    <style>
      .serif{fill:#211a14;font-family:Georgia,"Times New Roman",serif}
      .mono{fill:#31281f;font-family:"Courier New",monospace}
      .muted{fill:#665b48;font-family:"Courier New",monospace}
      .red{fill:#a51f1d;font-family:"Courier New",monospace}
      .small{font-size:15px;font-weight:700}
      .tiny{font-size:12px;font-weight:700}
      .micro{font-size:10px;font-weight:700}
      .body{font-size:14px;font-weight:700}
      .section{fill:#211a14;font-family:"Courier New",monospace;font-size:17px;font-weight:900}
      .title{fill:#17120d;font-family:"Courier New",monospace;font-size:33px;font-weight:900;letter-spacing:2px}
      .subtitle{fill:#211a14;font-family:"Courier New",monospace;font-size:16px;font-weight:900;letter-spacing:1.4px}
      .outcome{fill:#a51f1d;font-family:"Courier New",monospace;font-size:34px;font-weight:900;letter-spacing:4px}
      .photoText{fill:#1d1812;font-family:Georgia,"Times New Roman",serif;font-size:30px;font-weight:900}
      .specimen{fill:#a51f1d;font-family:"Courier New",monospace;font-size:76px;font-weight:900;letter-spacing:5px}
      .watermarkText{fill:#6a5d42;font-family:"Courier New",monospace;font-size:22px;font-weight:900;letter-spacing:4px}
    </style>
  </defs>
  <rect width="1080" height="1350" fill="#050403"/>
  <image href="${escapeSvg(assets.paper)}" x="0" y="0" width="1080" height="1350" preserveAspectRatio="none"/>
  <path d="M 42 38 H 1038 V 1308 H 42 Z" fill="none" stroke="#211a14" stroke-width="1.6" opacity="0.42"/>
  ${agencyWatermark(540, 690, 0.98, -7, 0.075)}
  ${status === "SPECIMEN" ? specimenWatermark() : ""}

  ${bureauSeal(122, 96)}
  <text x="424" y="75" text-anchor="middle" class="title">OMNIVERSUS ANALYSIS BUREAU</text>
  <text x="424" y="110" text-anchor="middle" class="subtitle">CLASSIFIED INTERACTION DOSSIER</text>
  <line x1="688" y1="48" x2="688" y2="132" stroke="#211a14" stroke-width="1.2"/>
  <text x="720" y="68" class="mono body">FILE:   OV-${escapeSvg(artifact.docRef)}</text>
  <text x="720" y="94" class="mono body">CLEARANCE: ${escapeSvg(status)}</text>
  <text x="720" y="120" class="mono body">STATUS: SIMULATED VERDICT</text>
  <rect x="208" y="144" width="198" height="30" fill="none" stroke="#211a14" stroke-width="1.3"/>
  <text x="307" y="165" text-anchor="middle" class="mono body">${status === "SPECIMEN" ? "SPECIMEN / TRAINING FILE" : "PUBLIC REDACTION FILE"}</text>
  ${declassifiedStamp(690, 140, 335, 122, assets.stamp, -6)}

  <line x1="58" y1="196" x2="1022" y2="196" stroke="#211a14" stroke-width="1.5"/>
  ${memoField(62, 224, "ANALYST:", "O.A.B. SYNTHETIC DESK")}
  ${memoField(62, 249, "DIVISION:", "INTERACTION ANALYTICS")}
  ${memoField(62, 274, "BRANCH:", "STRATEGIC ASSESSMENT")}
  ${memoField(362, 224, "DATE:", "SESSION FILE")}
  ${memoField(362, 249, "DOC TYPE:", "INTERACTION ASSESSMENT")}
  ${memoField(362, 274, "PAGES:", "1 OF 1")}
  ${memoField(650, 224, "ROUTING CODE:", `OV-${artifact.docRef}`)}
  ${memoField(650, 249, "SIM ID:", reportSerial)}
  ${memoField(650, 274, "CONFIDENCE:", `${clampScore(artifact.confidence)} / 100`)}

  <rect x="58" y="300" width="964" height="172" fill="none" stroke="#211a14" stroke-width="1.5"/>
  <text x="72" y="328" class="section">PRIMARY ASSESSMENT</text>
  <text x="540" y="380" text-anchor="middle" class="outcome">${escapeSvg(outcome)}</text>
  <text x="188" y="420" class="mono body">Reason:</text>
  ${svgMultilineText(reasonLines, 260, 420, 25, "mono body")}

  <rect x="58" y="472" width="964" height="238" fill="none" stroke="#211a14" stroke-width="1.5"/>
  <line x1="540" y1="472" x2="540" y2="710" stroke="#211a14" stroke-width="1.2"/>
  ${subjectDossier(244, 502, subjectA, "A")}
  ${subjectDossier(586, 502, subjectB, "B")}
  ${evidencePhoto(72, 472, subjectA, -4, assets)}
  ${evidencePhoto(850, 488, subjectB, 5, assets)}

  ${interactionTable(58, 720, artifact)}
  ${assumptionsTable(58, 930, artifact)}
  ${keyFindings(58, 1130, artifact)}

  <text x="62" y="1288" class="mono tiny">STANDARD ENCOUNTER // NO PREP UNLESS FILED // CANON-NEUTRAL INTERPRETATION // SOURCE RECORD RETAINED ON REPORT PAGE</text>
  <rect x="890" y="1262" width="132" height="42" fill="none" stroke="#211a14" stroke-width="1.1"/>
  <text x="956" y="1280" text-anchor="middle" class="mono tiny">O.A.B. FORM-IA-9</text>
  <text x="956" y="1298" text-anchor="middle" class="mono tiny">REV. 3.7.2</text>
</svg>`;
}

function memoField(x: number, y: number, label: string, value: string) {
  return `<text x="${x}" y="${y}" class="mono tiny"><tspan font-weight="900">${escapeSvg(label)}</tspan> ${escapeSvg(truncate(displayVerdict(value), 30))}</text>`;
}

function bureauSeal(cx: number, cy: number) {
  return `<g transform="translate(${cx} ${cy})">
    <circle r="59" fill="none" stroke="#211a14" stroke-width="1.6"/>
    <circle r="48" fill="none" stroke="#211a14" stroke-width="1"/>
    <circle r="28" fill="none" stroke="#211a14" stroke-width="1.2"/>
    <path d="M -43 0 C -22 -25 22 -25 43 0 C 22 25 -22 25 -43 0 Z" fill="none" stroke="#211a14" stroke-width="1.2"/>
    <path d="M 0 -49 V 49 M -49 0 H 49 M -34 -34 L 34 34 M 34 -34 L -34 34" stroke="#211a14" stroke-width="0.8" opacity="0.82"/>
    <text x="0" y="-67" text-anchor="middle" class="mono micro" transform="rotate(-8)">OMNIVERSUS ANALYSIS BUREAU</text>
    <text x="0" y="75" text-anchor="middle" class="mono small">*</text>
  </g>`;
}

function subjectDossier(
  x: number,
  y: number,
  subject: ArtifactSubject,
  side: "A" | "B",
) {
  const profileLines = wrapText(subject.profile, 30, 2);
  const constraintLines = wrapText(subject.constraint, 34, 2);

  return `<g>
    <text x="${x}" y="${y}" class="section">SUBJECT ${side} DOSSIER</text>
    <text x="${x}" y="${y + 38}" class="mono body">Name: ${escapeSvg(truncate(displayTitle(subject.name), 24))}</text>
    <text x="${x}" y="${y + 66}" class="mono body">Origin: ${escapeSvg(truncate(displayVerdict(subject.origin), 24))}</text>
    <text x="${x}" y="${y + 94}" class="mono body">Threat Class: ${escapeSvg(truncate(displayVerdict(subject.tier), 20))}</text>
    <text x="${x}" y="${y + 122}" class="mono body">Primary Route:</text>
    ${svgMultilineText(profileLines, x + 122, y + 122, 22, "mono body")}
    <text x="${x}" y="${y + 181}" class="mono body">Known Constraint:</text>
    ${svgMultilineText(constraintLines, x + 144, y + 181, 20, "mono body")}
  </g>`;
}

function evidencePhoto(
  x: number,
  y: number,
  subject: ArtifactSubject,
  rotate: number,
  assets: ShareableArtifactAssets,
) {
  const frameWidth = 178;
  const frameHeight = 242;
  const photoX = x + 20;
  const photoY = y + 26;
  const photoWidth = 138;
  const photoHeight = 174;

  return `<g transform="rotate(${rotate} ${x + 82} ${y + 100})">
    <rect x="${x + 13}" y="${y + 18}" width="${frameWidth}" height="${frameHeight}" fill="#1b1712" opacity="0.22"/>
    <rect x="${photoX}" y="${photoY}" width="${photoWidth}" height="${photoHeight}" fill="#20201e" opacity="0.84"/>
    <circle cx="${photoX + photoWidth / 2}" cy="${photoY + 66}" r="36" fill="#6c6a61" opacity="0.58"/>
    <path d="M ${photoX + 28} ${photoY + 156} C ${photoX + 44} ${photoY + 112} ${photoX + 96} ${photoY + 112} ${photoX + 112} ${photoY + 156}" fill="#77746a" opacity="0.54"/>
    <path d="M ${photoX + 38} ${photoY + 70} C ${photoX + 54} ${photoY + 30} ${photoX + 102} ${photoY + 44} ${photoX + 106} ${photoY + 88}" fill="none" stroke="#151412" stroke-width="4" opacity="0.55"/>
    ${redactionBar(photoX + 36, photoY + 72, 70, 16)}
    <text x="${photoX + photoWidth / 2}" y="${y + 218}" text-anchor="middle" class="photoText" opacity="0.46">${escapeSvg(subject.initials)}</text>
    <image href="${escapeSvg(assets.frame)}" x="${x}" y="${y}" width="${frameWidth}" height="${frameHeight}" preserveAspectRatio="none"/>
    ${tapeStrip(x - 22, y - 20, 82, 40, -16, assets.tape)}
    ${tapeStrip(x + 120, y - 14, 76, 37, 16, assets.tape)}
  </g>`;
}

function tapeStrip(
  x: number,
  y: number,
  width: number,
  height: number,
  rotate: number,
  tape: string,
) {
  return `<image href="${escapeSvg(tape)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none" opacity="0.88" transform="rotate(${rotate} ${x + width / 2} ${y + height / 2})"/>`;
}

function interactionTable(x: number, y: number, artifact: ShareableArtifact) {
  const rows = artifact.metrics.length ? artifact.metrics : [];

  return `<g>
    <rect x="${x}" y="${y}" width="964" height="186" fill="none" stroke="#211a14" stroke-width="1.5"/>
    <text x="${x + 20}" y="${y + 24}" class="section">ABILITY INTERACTION ASSESSMENT</text>
    <line x1="${x}" y1="${y + 32}" x2="${x + 964}" y2="${y + 32}" stroke="#211a14" stroke-width="1"/>
    <line x1="${x + 250}" y1="${y + 32}" x2="${x + 250}" y2="${y + 186}" stroke="#211a14" stroke-width="1"/>
    <line x1="${x + 520}" y1="${y + 32}" x2="${x + 520}" y2="${y + 186}" stroke="#211a14" stroke-width="1"/>
    <line x1="${x + 790}" y1="${y + 32}" x2="${x + 790}" y2="${y + 186}" stroke="#211a14" stroke-width="1"/>
    <text x="${x + 44}" y="${y + 57}" class="mono body">Interaction Node</text>
    <text x="${x + 292}" y="${y + 57}" class="mono body">Assessment</text>
    <text x="${x + 558}" y="${y + 57}" class="mono body">Resistance / Countermeasure</text>
    <text x="${x + 820}" y="${y + 57}" class="mono body">Verdict Weight</text>
    ${rows.map((metric, index) => interactionTableRow(x, y + 84 + index * 25, metric, index)).join("\n")}
  </g>`;
}

function interactionTableRow(
  x: number,
  y: number,
  metric: ArtifactMetric,
  index: number,
) {
  return `<g>
    <line x1="${x}" y1="${y - 19}" x2="${x + 964}" y2="${y - 19}" stroke="#211a14" stroke-width="0.8" opacity="0.7"/>
    <text x="${x + 20}" y="${y}" class="mono tiny">R-${String(index + 1).padStart(2, "0")} ${escapeSvg(truncate(metric.label, 25))}</text>
    <text x="${x + 292}" y="${y}" class="mono tiny">${escapeSvg(truncate(displayVerdict(metric.assessment), 31))}</text>
    <text x="${x + 558}" y="${y}" class="mono tiny">${escapeSvg(truncate(metric.countermeasure, 37))}</text>
    <text x="${x + 858}" y="${y}" text-anchor="middle" class="mono tiny">${escapeSvg(truncate(displayVerdict(metric.weight), 17))}</text>
  </g>`;
}

function assumptionsTable(
  x: number,
  y: number,
  artifact: ShareableArtifact,
) {
  const rows = artifact.assumptions.slice(0, 6);

  return `<g>
    <rect x="${x}" y="${y}" width="964" height="174" fill="none" stroke="#211a14" stroke-width="1.5"/>
    <text x="${x + 20}" y="${y + 25}" class="section">ENGAGEMENT ASSUMPTIONS</text>
    <line x1="${x}" y1="${y + 34}" x2="${x + 964}" y2="${y + 34}" stroke="#211a14" stroke-width="1"/>
    <line x1="${x + 378}" y1="${y + 34}" x2="${x + 378}" y2="${y + 174}" stroke="#211a14" stroke-width="1"/>
    ${rows.map((row, index) => assumptionRow(x, y + 57 + index * 21, row, index)).join("\n")}
  </g>`;
}

function assumptionRow(x: number, y: number, row: ArtifactAssumption, index: number) {
  return `<g>
    <line x1="${x}" y1="${y - 17}" x2="${x + 964}" y2="${y - 17}" stroke="#211a14" stroke-width="0.65" opacity="0.7"/>
    <text x="${x + 20}" y="${y}" class="mono tiny">${index + 1}.</text>
    <text x="${x + 44}" y="${y}" class="mono tiny">${escapeSvg(truncate(displayVerdict(row.label), 34))}</text>
    <text x="${x + 396}" y="${y}" class="mono tiny">${escapeSvg(truncate(row.value, 74))}</text>
  </g>`;
}

function keyFindings(x: number, y: number, artifact: ShareableArtifact) {
  const findings = artifact.logs.slice(0, 3);

  return `<g>
    <rect x="${x}" y="${y}" width="964" height="84" fill="none" stroke="#211a14" stroke-width="1.5"/>
    <text x="${x + 20}" y="${y + 25}" class="section">KEY FINDINGS</text>
    ${findings.map((finding, index) => `<text x="${x + 22}" y="${y + 50 + index * 20}" class="mono tiny">${index + 1}. ${escapeSvg(displayVerdict(finding.label))}: ${escapeSvg(truncate(finding.value, 96))}</text>`).join("\n")}
  </g>`;
}

function specimenWatermark() {
  return `<text x="540" y="742" text-anchor="middle" class="specimen" opacity="0.12" transform="rotate(-18 540 742)">SPECIMEN</text>`;
}

function declassifiedStamp(
  x: number,
  y: number,
  width: number,
  height: number,
  stamp: string,
  rotate: number,
) {
  return `<image href="${escapeSvg(stamp)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" opacity="0.92" transform="rotate(${rotate} ${x + width / 2} ${y + height / 2})"/>`;
}

function redactionBar(x: number, y: number, width: number, height: number) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#211a14" opacity="0.86"/>`;
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

function loadShareableArtifactAssets() {
  shareableArtifactAssetsPromise ??= Promise.all([
    publicAssetDataUrl(CLASSIFIED_PAPER_ASSET),
    publicAssetDataUrl(DECLASSIFIED_STAMP_ASSET),
    publicAssetDataUrl(EVIDENCE_PHOTO_FRAME_ASSET),
    publicAssetDataUrl(MASKING_TAPE_ASSET),
  ]).then(([paper, stamp, frame, tape]) => ({ frame, paper, stamp, tape }));

  return shareableArtifactAssetsPromise;
}

async function publicAssetDataUrl(path: string) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Asset load failed: ${path}`);
  }

  return await blobToDataUrl(await response.blob());
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Asset encoding failed"));
    };
    reader.onerror = () => reject(new Error("Asset encoding failed"));
    reader.readAsDataURL(blob);
  });
}

function canShareFile(file: File) {
  try {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
}

function canUseNativeShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

async function copyText(text: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard unavailable");
  }

  await navigator.clipboard.writeText(text);
}

function currentReportUrl() {
  if (typeof window === "undefined") return "";

  return window.location.href;
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

function shareTitle(artifact: ShareableArtifact) {
  return `${artifact.subjects[0].name} vs ${artifact.subjects[1].name}`;
}

function shareText(artifact: ShareableArtifact) {
  return `${certifiedOutcome(artifact)} // ${truncate(artifact.summary, 96)}`;
}

function winnerSubjectLabel(artifact: ShareableArtifact) {
  const winnerSide = artifact.winnerSide?.toUpperCase();

  if (winnerSide === "A" || winnerSide === "B") {
    return winnerSide;
  }

  if (
    winnerSide === "TIE" ||
    winnerSide === "DRAW" ||
    winnerSide === "INCONCLUSIVE"
  ) {
    return "NO CLEAN WINNER";
  }

  const winnerName = artifact.winner.toLowerCase();
  const winnerSubject = artifact.subjects.find((subject) =>
    winnerName.includes(subject.name.toLowerCase()),
  );

  return winnerSubject?.side ?? "UNRESOLVED VERDICT";
}

function caseCaption(artifact: ShareableArtifact) {
  return `${displayTitle(artifact.subjects[0].name)} v. ${displayTitle(
    artifact.subjects[1].name,
  )}`;
}

function certifiedOutcome(artifact: ShareableArtifact) {
  const subjectLabel = winnerSubjectLabel(artifact);

  if (subjectLabel === "A" || subjectLabel === "B") {
    return `${displayVerdict(artifact.winner)} PREVAILS`;
  }

  return subjectLabel;
}

function isShareAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
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
