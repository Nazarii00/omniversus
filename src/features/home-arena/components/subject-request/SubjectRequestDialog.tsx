"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent,
} from "react";
import styles from "./SubjectRequestDialog.module.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SubjectRequestDialogProps = {
  initialSubjectName?: string;
  onClose: () => void;
};

type PhotoCrop = {
  x: number;
  y: number;
  zoom: number;
};

type FormData = {
  subjectName: string;
  universe: string;
  photoFile: File | null;
  photoCrop: PhotoCrop;
  intelSources: string;
  keyFeats: string;
  additionalNotes: string;
  submitterName: string;
};

type FieldKey = keyof FormData;

type BlockField = {
  key: FieldKey;
  label: string;
  placeholder: string;
  required: boolean;
  multiline: boolean;
  isPhoto: boolean;
};

type WizardBlock = {
  id: string;
  title: string;
  fields: BlockField[];
};

const WIZARD_BLOCKS: WizardBlock[] = [
  {
    id: "IDENTIFY",
    title: "IDENTIFY",
    fields: [
      {
        key: "subjectName",
        label: "SUBJECT ALIAS",
        placeholder: "e.g. Goku, Batman, SCP-096",
        required: true,
        multiline: false,
        isPhoto: false,
      },
      {
        key: "universe",
        label: "UNIVERSE / ORIGIN",
        placeholder: "e.g. Dragon Ball, DC Comics",
        required: true,
        multiline: false,
        isPhoto: false,
      },
    ],
  },
  {
    id: "EVIDENCE",
    title: "EVIDENCE",
    fields: [
      {
        key: "photoFile",
        label: "REFERENCE PHOTO",
        placeholder: "",
        required: false,
        multiline: false,
        isPhoto: true,
      },
      {
        key: "intelSources",
        label: "INTEL SOURCES (optional)",
        placeholder: "Wiki / VSBW links...",
        required: false,
        multiline: true,
        isPhoto: false,
      },
      {
        key: "keyFeats",
        label: "KEY FEATS & EVIDENCE (optional)",
        placeholder: "Important feats with evidence...",
        required: false,
        multiline: true,
        isPhoto: false,
      },
    ],
  },
  {
    id: "CONTEXT",
    title: "CONTEXT",
    fields: [
      {
        key: "additionalNotes",
        label: "ADDITIONAL NOTES (optional)",
        placeholder: "Why add them? Version?",
        required: false,
        multiline: true,
        isPhoto: false,
      },
      {
        key: "submitterName",
        label: "AGENT SIGNATURE (optional)",
        placeholder: "Your name or callsign",
        required: false,
        multiline: false,
        isPhoto: false,
      },
    ],
  },
];

const TOTAL_BLOCKS = WIZARD_BLOCKS.length;

const EMPTY_FORM: FormData = {
  subjectName: "",
  universe: "",
  photoFile: null,
  photoCrop: { x: 0, y: 0, zoom: 1 },
  intelSources: "",
  keyFeats: "",
  additionalNotes: "",
  submitterName: "",
};

const PHOTO_PREVIEW_W = 300;
const PHOTO_PREVIEW_H = 200;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SubjectRequestDialog({
  initialSubjectName = "",
  onClose,
}: SubjectRequestDialogProps) {
  const [blockIndex, setBlockIndex] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    ...EMPTY_FORM,
    subjectName: initialSubjectName,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo preview state
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoNatural, setPhotoNatural] = useState({ w: 0, h: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragLast = useRef({ x: 0, y: 0 });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const isConfirmStep = blockIndex >= TOTAL_BLOCKS;
  const currentBlock = WIZARD_BLOCKS[blockIndex] ?? null;
  const progress = Math.round((blockIndex / TOTAL_BLOCKS) * 100);

  // Close on Escape
  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Focus first input on block change
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
      textareaRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [blockIndex]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- Helpers --
  function blockValid(): boolean {
    if (!currentBlock) return false;
    return currentBlock.fields.every((f) => {
      if (!f.required) return true;
      if (f.key === "photoFile") return true; // photo is optional
      return formData[f.key].toString().trim().length > 0;
    });
  }

  function goNext() {
    if (!blockValid()) return;
    if (blockIndex < TOTAL_BLOCKS - 1) {
      setBlockIndex((s) => s + 1);
    } else {
      setBlockIndex(TOTAL_BLOCKS);
    }
  }

  function goBack() {
    if (isConfirmStep) {
      setBlockIndex(TOTAL_BLOCKS - 1);
    } else if (blockIndex > 0) {
      setBlockIndex((s) => s - 1);
    }
  }

  function getFieldValue(key: FieldKey): string {
    const v = formData[key];
    if (v === null || v === undefined) return "";
    if (v instanceof File) return v.name;
    return String(v);
  }

  function updateText(key: FieldKey, value: string) {
    setFormData((p) => ({ ...p, [key]: value }));
  }

  // -- Photo handlers --
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    const url = URL.createObjectURL(file);
    setPhotoPreviewUrl(url);
    setFormData((p) => ({
      ...p,
      photoFile: file,
      photoCrop: { x: 0, y: 0, zoom: 1 },
    }));
    // Load natural dimensions
    const img = new Image();
    img.onload = () =>
      setPhotoNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }

  function resetPhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    setPhotoNatural({ w: 0, h: 0 });
    setFormData((p) => ({
      ...p,
      photoFile: null,
      photoCrop: { x: 0, y: 0, zoom: 1 },
    }));
    if (fileRef.current) fileRef.current.value = "";
  }

  function handlePhotoMouseDown(e: ReactMouseEvent) {
    e.preventDefault();
    setIsDragging(true);
    dragLast.current = { x: e.clientX, y: e.clientY };
  }

  function handlePhotoMouseMove(e: ReactMouseEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragLast.current.x;
    const dy = e.clientY - dragLast.current.y;
    dragLast.current = { x: e.clientX, y: e.clientY };
    setFormData((p) => ({
      ...p,
      photoCrop: {
        ...p.photoCrop,
        x: p.photoCrop.x + dx,
        y: p.photoCrop.y + dy,
      },
    }));
  }

  function handlePhotoMouseUp() {
    setIsDragging(false);
  }

  function handlePhotoWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setFormData((p) => ({
      ...p,
      photoCrop: {
        ...p.photoCrop,
        zoom: clamp(p.photoCrop.zoom + delta, 0.4, 3),
      },
    }));
  }

  // -- Submit --
  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("subjectName", formData.subjectName);
      fd.append("universe", formData.universe);
      if (formData.photoFile) fd.append("photo", formData.photoFile);
      fd.append("photoCrop", JSON.stringify(formData.photoCrop));
      fd.append("intelSources", formData.intelSources);
      fd.append("keyFeats", formData.keyFeats);
      fd.append("additionalNotes", formData.additionalNotes);
      fd.append("submitterName", formData.submitterName);

      const r = await fetch("/api/subject-requests", {
        method: "POST",
        body: fd,
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || "Failed to submit request.");
      }
      setIsSuccess(true);
      setTimeout(() => onClose(), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      setIsSubmitting(false);
    }
  }

  function handleBackdropClick(e: ReactMouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  // -- Render photo preview --
  function renderPhotoField() {
    const hasPhoto = !!photoPreviewUrl;
    return (
      <div className={styles.photoSection}>
        <div className={styles.photoInputRow}>
          <span className={styles.promptChar}>{">"}</span>
          <span className={styles.photoLabel}>REFERENCE PHOTO:</span>
          <button
            type="button"
            className={styles.browseBtn}
            onClick={() => fileRef.current?.click()}
            disabled={isSubmitting}
          >
            [BROWSE]
          </button>
          {hasPhoto && (
            <button
              type="button"
              className={styles.browseBtn}
              onClick={resetPhoto}
              disabled={isSubmitting}
            >
              [CLEAR]
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className={styles.hiddenFileInput}
          />
        </div>
        {hasPhoto && (
          <div className={styles.photoPreviewWrap}>
            <div
              className={styles.photoPreview}
              style={{ width: PHOTO_PREVIEW_W, height: PHOTO_PREVIEW_H }}
              onMouseDown={handlePhotoMouseDown}
              onMouseMove={handlePhotoMouseMove}
              onMouseUp={handlePhotoMouseUp}
              onMouseLeave={handlePhotoMouseUp}
              onWheel={handlePhotoWheel}
            >
              <img
                src={photoPreviewUrl}
                alt="Preview"
                draggable={false}
                style={{
                  transform: `translate(${formData.photoCrop.x}px, ${formData.photoCrop.y}px) scale(${formData.photoCrop.zoom})`,
                  transformOrigin: "center center",
                  maxWidth: "none",
                  display: "block",
                }}
              />
            </div>
            <span className={styles.photoHint}>
              Drag to reposition | Scroll to zoom | Zoom:{" "}
              {formData.photoCrop.zoom.toFixed(2)}x
            </span>
          </div>
        )}
      </div>
    );
  }

  // -- Common key handler for inputs --
  function handleInputKeyDown(
    e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      goNext();
    }
  }

  return (
    <div className={styles.backdrop} onMouseDown={handleBackdropClick}>
      <div
        className={styles.terminal}
        ref={terminalRef}
        role="dialog"
        aria-modal="true"
      >
        {/* Titlebar */}
        <div className={styles.titlebar}>
          <span className={styles.titlebarTitle}>C:\Omniversus\intel.exe</span>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            [X]
          </button>
        </div>

        {/* Screen */}
        <div className={styles.screen}>
          {/* Progress */}
          <div className={styles.progressBar}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={styles.progressLabel}>
              BLOCK {isConfirmStep ? "◇" : blockIndex + 1}/{TOTAL_BLOCKS}
            </span>
          </div>

          {/* Error */}
          {error && <p className={styles.errorLine}>[ERROR]: {error}</p>}

          {/* Success overlay */}
          {isSuccess && (
            <div className={styles.successOverlay}>
              <span className={styles.successCode}>INTEL FILE COMMITTED</span>
              <span className={styles.successMsg}>
                Intel file queued for review. Closing...
              </span>
            </div>
          )}

          {/* Confirm step */}
          {isConfirmStep ? (
            <div className={styles.blockSection}>
              <span className={styles.confirmHeader}>
                BLOCK ◇ — REVIEW & CONFIRM
              </span>
              <ul className={styles.confirmList}>
                {WIZARD_BLOCKS.map((block) =>
                  block.fields.map((f) => (
                    <li key={f.key}>
                      <span className={styles.confirmField}>{f.label}: </span>
                      {f.key === "photoFile" ? (
                        formData.photoFile ? (
                          <span className={styles.confirmValue}>
                            {formData.photoFile.name}
                          </span>
                        ) : (
                          <span className={styles.confirmMissing}>
                            (no photo)
                          </span>
                        )
                      ) : formData[f.key].toString().trim() ? (
                        <span className={styles.confirmValue}>
                          {formData[f.key].toString().slice(0, 80)}
                          {formData[f.key].toString().length > 80 ? "..." : ""}
                        </span>
                      ) : (
                        <span className={styles.confirmMissing}>(empty)</span>
                      )}
                    </li>
                  )),
                )}
              </ul>
              <p className={styles.confirmPrompt}>
                <span className={styles.promptChar}>{">"}</span> Commit intel
                file? [Y / n]
              </p>

              <div className={styles.actions}>
                <button type="button" onClick={goBack} disabled={isSubmitting}>
                  [BACK]
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "[FILING...]" : "[COMMIT]"}
                </button>
                <button type="button" onClick={onClose} disabled={isSubmitting}>
                  [ABORT]
                </button>
              </div>
            </div>
          ) : currentBlock ? (
            <div className={styles.blockSection}>
              <span className={styles.blockTitle}>
                BLOCK {blockIndex + 1}/{TOTAL_BLOCKS} — {currentBlock.title}
              </span>

              {currentBlock.fields.map((f) => {
                if (f.isPhoto) {
                  return <div key={f.key}>{renderPhotoField()}</div>;
                }
                if (f.multiline) {
                  return (
                    <div key={f.key} className={styles.fieldRow}>
                      <span className={styles.promptChar}>{">"}</span>
                      <textarea
                        ref={textareaRef}
                        className={styles.fieldTextarea}
                        value={getFieldValue(f.key)}
                        onChange={(e) => updateText(f.key, e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder={f.placeholder}
                        disabled={isSubmitting || isSuccess}
                        rows={3}
                      />
                      <span className={styles.fieldLabel}>{f.label}</span>
                    </div>
                  );
                }
                return (
                  <div key={f.key} className={styles.fieldRow}>
                    <span className={styles.promptChar}>{">"}</span>
                    <input
                      ref={inputRef}
                      className={styles.fieldInput}
                      type="text"
                      value={getFieldValue(f.key)}
                      onChange={(e) => updateText(f.key, e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder={f.placeholder}
                      disabled={isSubmitting || isSuccess}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <span className={styles.fieldLabel}>{f.label}</span>
                  </div>
                );
              })}

              <span className={styles.hint}>
                Enter — next | Shift+Tab — back | Esc — abort
              </span>

              <div className={styles.actions}>
                {blockIndex > 0 && (
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={isSubmitting}
                  >
                    [BACK]
                  </button>
                )}
                <button
                  type="button"
                  onClick={goNext}
                  disabled={isSubmitting || !blockValid()}
                >
                  [NEXT]
                </button>
                <button type="button" onClick={onClose} disabled={isSubmitting}>
                  [ABORT]
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
