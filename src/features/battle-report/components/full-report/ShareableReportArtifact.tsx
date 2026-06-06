"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  buildShareableArtifact,
  canShareFile,
  canUseNativeShare,
  caseCaption,
  copyText,
  currentReportUrl,
  downloadBlob,
  isShareAbortError,
  loadShareableArtifactAssets,
  renderShareableReportSvg,
  renderSvgToPngBlob,
  shareFileName,
  shareText,
  shareTitle,
  type ShareableArtifact,
  type ShareableReportActionsProps,
} from "./shareableReportArtifactRenderer";
import styles from "../../styles/ShareableReportArtifact.module.css";

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

