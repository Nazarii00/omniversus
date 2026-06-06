"use client";

import { useState, type FormEvent, useEffect, useRef } from "react";
import styles from "./SubjectRequestDialog.module.css";

type SubjectRequestDialogProps = {
  initialSubjectName?: string;
  onClose: () => void;
};

export function SubjectRequestDialog({
  initialSubjectName = "",
  onClose,
}: SubjectRequestDialogProps) {
  const [subjectName, setSubjectName] = useState(initialSubjectName);
  const [universe, setUniverse] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [intelSources, setIntelSources] = useState("");
  const [keyFeats, setKeyFeats] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [submitterName, setSubmitterName] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!subjectName.trim() || !universe.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/subject-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subjectName,
          universe,
          photoUrl,
          intelSources,
          keyFeats,
          additionalNotes,
          submitterName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit request.");
      }

      setIsSuccess(true);
      // Automatically close after a short delay to show the stamp
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      setIsSubmitting(false);
    }
  }

  function handleBackdropClick(event: React.MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div className={styles.backdrop} onMouseDown={handleBackdropClick}>
      <div className={styles.dossier} ref={dialogRef} role="dialog" aria-modal="true">
        {isSuccess && <div className={styles.stampOverlay}>RECEIVED</div>}
        
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.classification}>Top Secret // Request Form</span>
            <h2 className={styles.title}>Subject Intel File</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            [X]
          </button>
        </header>

        {error && <div className={styles.errorText}>[ERROR]: {error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="subjectName">Subject Alias</label>
            <input
              id="subjectName"
              type="text"
              className={styles.input}
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Goku, Batman, SCP-096"
              required
              disabled={isSubmitting || isSuccess}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="universe">Universe / Origin</label>
            <input
              id="universe"
              type="text"
              className={styles.input}
              value={universe}
              onChange={(e) => setUniverse(e.target.value)}
              placeholder="e.g. Dragon Ball, DC Comics, SCP Foundation"
              required
              disabled={isSubmitting || isSuccess}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="photoUrl">Reference Photo URL <span className={styles.optional}>(optional)</span></label>
            <input
              id="photoUrl"
              type="url"
              className={styles.input}
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              disabled={isSubmitting || isSuccess}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="intelSources">Intel Sources <span className={styles.optional}>(optional)</span></label>
            <textarea
              id="intelSources"
              className={styles.textarea}
              value={intelSources}
              onChange={(e) => setIntelSources(e.target.value)}
              placeholder="Links to Wiki, VSBW, or official character profiles..."
              disabled={isSubmitting || isSuccess}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="keyFeats">Key Feats & Evidence <span className={styles.optional}>(optional)</span></label>
            <textarea
              id="keyFeats"
              className={styles.textarea}
              value={keyFeats}
              onChange={(e) => setKeyFeats(e.target.value)}
              placeholder="Mention important feats and provide links to scans/evidence..."
              disabled={isSubmitting || isSuccess}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="additionalNotes">Additional Notes <span className={styles.optional}>(optional)</span></label>
            <textarea
              id="additionalNotes"
              className={styles.textarea}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Why should they be added? Specific version requested?"
              disabled={isSubmitting || isSuccess}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="submitterName">Field Agent <span className={styles.optional}>(optional)</span></label>
            <input
              id="submitterName"
              type="text"
              className={styles.input}
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              placeholder="Your name or callsign"
              disabled={isSubmitting || isSuccess}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting || isSuccess}>
              Abort
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting || isSuccess}>
              {isSubmitting ? "Filing..." : "Submit File"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
