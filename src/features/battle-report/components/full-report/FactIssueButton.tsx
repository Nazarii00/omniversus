"use client";

import {
  useEffect,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import {
  ReportAppealError,
  submitReportAppeal,
  type ReportAppealTarget,
} from "../../api";
import styles from "./FactIssueButton.module.css";

export function FactIssueButton({
  active,
  onSubmitted,
  target,
}: {
  active: boolean;
  onSubmitted: (appealId: string) => void;
  target: ReportAppealTarget;
}) {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isFiled = active;
  const storageKey = [
    "omniversus",
    "appeal",
    target.reportId,
    target.targetType,
    target.targetId,
  ].join(":");

  useEffect(() => {
    try {
      const storedAppealId = window.localStorage.getItem(storageKey);

      if (storedAppealId) {
        onSubmitted(storedAppealId);
      }
    } catch {
      // Browser storage is optional; the database queue remains authoritative.
    }
  }, [onSubmitted, storageKey]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = readFormString(formData, "body");

    if (body.length < 10) {
      setError("Add at least 10 characters so the review queue has context.");
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await submitReportAppeal({
          ...target,
          body,
          proposedText: readOptionalFormString(formData, "proposedText"),
          sourceRef:
            readOptionalFormString(formData, "sourceRef") ?? target.sourceRef,
          submitterName: readOptionalFormString(formData, "submitterName"),
          submitterContact: readOptionalFormString(
            formData,
            "submitterContact",
          ),
        });

        form.reset();
        try {
          window.localStorage.setItem(storageKey, result.appealId);
        } catch {
          // Ignore storage failures; the appeal was already created server-side.
        }
        setIsOpen(false);
        onSubmitted(result.appealId);
      } catch (submitError) {
        setError(
          submitError instanceof ReportAppealError ||
            submitError instanceof Error
            ? submitError.message
            : "Could not submit appeal.",
        );
      }
    });
  }

  return (
    <div className={styles.factIssueControl}>
      <button
        type="button"
        className={styles.factIssueButton}
        data-active={isFiled}
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-pressed={isFiled}
        disabled={isPending}
        onClick={() => setIsOpen((current) => !current)}
        title={isFiled ? "Appeal filed" : "Request fact review"}
      >
        <span className={styles.factIssueIcon} aria-hidden="true">
          <i>!</i>
        </span>
        <span>{isFiled ? "Appeal filed" : "Review fact"}</span>
      </button>

      {isOpen ? (
        <form
          id={panelId}
          className={styles.factIssuePanel}
          onSubmit={handleSubmit}
        >
          <span className={styles.factIssuePanelTitle}>
            {target.targetType} / {target.targetId}
          </span>
          <p>{target.targetText}</p>
          <label>
            <span>Issue</span>
            <textarea
              name="body"
              minLength={10}
              maxLength={4000}
              rows={4}
              required
            />
          </label>
          <label>
            <span>Correction</span>
            <textarea name="proposedText" maxLength={4000} rows={3} />
          </label>
          <label>
            <span>Source</span>
            <input
              name="sourceRef"
              maxLength={1000}
              defaultValue={target.sourceRef ?? ""}
            />
          </label>
          <div className={styles.factIssuePanelIdentity}>
            <label>
              <span>Name</span>
              <input name="submitterName" maxLength={160} />
            </label>
            <label>
              <span>Contact</span>
              <input name="submitterContact" maxLength={220} />
            </label>
          </div>
          {error ? <strong>{error}</strong> : null}
          <div className={styles.factIssuePanelActions}>
            <button
              type="button"
              className={styles.factIssueSecondaryAction}
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.factIssuePrimaryAction}
              disabled={isPending}
            >
              {isPending ? "Submitting" : "Submit"}
            </button>
          </div>
        </form>
      ) : null}
      {isFiled ? (
        <span className={styles.factIssueFiledStatus}>Queued</span>
      ) : null}
    </div>
  );
}

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readOptionalFormString(
  formData: FormData,
  key: string,
): string | undefined {
  const value = readFormString(formData, key);

  return value || undefined;
}
