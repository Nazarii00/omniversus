"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import styles from "./SubjectRequestDialog.module.css";

// Types
type SubjectRequestDialogProps = {
  initialSubjectName?: string;
  onClose: () => void;
};

type FormData = {
  subjectName: string;
  universe: string;
  photoUrl: string;
  intelSources: string;
  keyFeats: string;
  additionalNotes: string;
  submitterName: string;
};

type FieldKey = keyof FormData;

type WizardStep = {
  key: FieldKey;
  label: string;
  placeholder: string;
  required: boolean;
  multiline: boolean;
};

// Constants
const WIZARD_STEPS: WizardStep[] = [
  {
    key: "subjectName",
    label: "SUBJECT ALIAS",
    placeholder: "e.g. Goku, Batman, SCP-096",
    required: true,
    multiline: false,
  },
  {
    key: "universe",
    label: "UNIVERSE / ORIGIN",
    placeholder: "e.g. Dragon Ball, DC Comics",
    required: true,
    multiline: false,
  },
  {
    key: "photoUrl",
    label: "REFERENCE PHOTO URL (optional)",
    placeholder: "https://...",
    required: false,
    multiline: false,
  },
  {
    key: "intelSources",
    label: "INTEL SOURCES (optional)",
    placeholder: "Wiki / VSBW links...",
    required: false,
    multiline: true,
  },
  {
    key: "keyFeats",
    label: "KEY FEATS & EVIDENCE (optional)",
    placeholder: "Important feats with evidence...",
    required: false,
    multiline: true,
  },
  {
    key: "additionalNotes",
    label: "ADDITIONAL NOTES (optional)",
    placeholder: "Why add them? Version?",
    required: false,
    multiline: true,
  },
  {
    key: "submitterName",
    label: "FIELD AGENT SIGNATURE (optional)",
    placeholder: "Your name or callsign",
    required: false,
    multiline: false,
  },
];

const TOTAL_STEPS = WIZARD_STEPS.length;

function generateFlogId(): string {
  const n = new Date();
  const pad = (v: number) => String(v).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `FLOG-${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}-${pad(n.getHours())}${pad(n.getMinutes())}-${seq}`;
}

const EMPTY_FORM: FormData = {
  subjectName: "",
  universe: "",
  photoUrl: "",
  intelSources: "",
  keyFeats: "",
  additionalNotes: "",
  submitterName: "",
};

// Component
export function SubjectRequestDialog({
  initialSubjectName = "",
  onClose,
}: SubjectRequestDialogProps) {
  const flogId = useMemo(() => generateFlogId(), []);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    ...EMPTY_FORM,
    subjectName: initialSubjectName,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Focus input on step change
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
      textareaRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [step]);

  const currentStep = WIZARD_STEPS[step] ?? null;
  const progress = Math.round((step / TOTAL_STEPS) * 100);
  const isConfirmStep = step >= TOTAL_STEPS;

  function updateField(value: string) {
    if (!currentStep) return;
    setFormData((p) => ({ ...p, [currentStep.key]: value }));
  }

  function goNext() {
    if (!currentStep) return;
    if (currentStep.required && !formData[currentStep.key].trim()) return;
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      setStep(TOTAL_STEPS); // go to confirm
    }
  }

  function goBack() {
    if (isConfirmStep) {
      setStep(TOTAL_STEPS - 1);
    } else if (step > 0) {
      setStep((s) => s - 1);
    }
  }

  function handleKeyDown(
    e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      goNext();
    }
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      goBack();
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/subject-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  const completedSteps = WIZARD_STEPS.slice(0, step).filter((s) =>
    formData[s.key].trim(),
  );

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
          <span className={styles.titlebarTitle}>C:\Omniversus\flog.exe</span>
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
          <p className={styles.flogHeader}>
            [{flogId}] Initializing intel submission...
          </p>

          {/* Progress */}
          <div className={styles.progressBar}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={styles.progressLabel}>
              {step}/{TOTAL_STEPS}
            </span>
          </div>

          {/* Completed steps log */}
          {completedSteps.length > 0 && (
            <pre className={styles.stepLog}>
              {completedSteps.map((s) => (
                <span key={s.key} className={styles.stepLogLine}>
                  [{flogId}] {s.label}: {formData[s.key].slice(0, 60)}
                  {formData[s.key].length > 60 ? "..." : ""}
                  {"\n"}
                </span>
              ))}
            </pre>
          )}

          {/* Error */}
          {error && <p className={styles.errorLine}>[ERROR]: {error}</p>}

          {/* Success overlay */}
          {isSuccess && (
            <div className={styles.successOverlay}>
              <span className={styles.successCode}>[{flogId}] COMMITTED</span>
              <span className={styles.successMsg}>
                Intel file queued for review. Closing...
              </span>
            </div>
          )}

          {/* Confirm step */}
          {isConfirmStep ? (
            <div className={styles.activeStep}>
              <span className={styles.confirmHeader}>REVIEW & CONFIRM</span>
              <ul className={styles.confirmList}>
                {WIZARD_STEPS.map((s) => (
                  <li key={s.key}>
                    <span className={styles.confirmField}>{s.label}: </span>
                    {formData[s.key].trim() ? (
                      <span className={styles.confirmValue}>
                        {formData[s.key].slice(0, 80)}
                        {formData[s.key].length > 80 ? "..." : ""}
                      </span>
                    ) : (
                      <span className={styles.confirmMissing}>(empty)</span>
                    )}
                  </li>
                ))}
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
          ) : currentStep ? (
            <div className={styles.activeStep}>
              <span className={styles.stepLabel}>
                Step {step + 1}/{TOTAL_STEPS}: {currentStep.label}
              </span>

              <div className={styles.promptLine}>
                <span className={styles.promptChar}>{">"}</span>
                {currentStep.multiline ? (
                  <textarea
                    ref={textareaRef}
                    className={styles.fieldTextarea}
                    value={formData[currentStep.key]}
                    onChange={(e) => updateField(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={currentStep.placeholder}
                    disabled={isSubmitting || isSuccess}
                    rows={3}
                  />
                ) : (
                  <input
                    ref={inputRef}
                    className={styles.fieldInput}
                    type="text"
                    value={formData[currentStep.key]}
                    onChange={(e) => updateField(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={currentStep.placeholder}
                    disabled={isSubmitting || isSuccess}
                    autoComplete="off"
                    spellCheck={false}
                  />
                )}
              </div>

              <span className={styles.hint}>
                Enter — next
                {currentStep.multiline ? " (Shift+Enter for newline)" : ""} |
                Shift+Tab — back | Esc — abort
              </span>

              <div className={styles.actions}>
                {step > 0 && (
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
                  disabled={
                    isSubmitting ||
                    (currentStep.required && !formData[currentStep.key].trim())
                  }
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
