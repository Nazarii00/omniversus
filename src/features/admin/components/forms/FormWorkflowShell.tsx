"use client";

import { Children, useEffect, useMemo, useState } from "react";

import styles from "../../styles/AdminPanel.module.css";

const STORAGE_KEY = "omniversus.admin.profileWorkflow.completed";

export type FormWorkflowStep = {
  description: string;
  id: string;
  optional?: boolean;
  title: string;
};

export function FormWorkflowShell({
  children,
  contextLabel,
  steps,
}: {
  children: React.ReactNode;
  contextLabel?: string;
  steps: FormWorkflowStep[];
}) {
  const panels = useMemo(() => Children.toArray(children), [children]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [hasLoadedProgress, setHasLoadedProgress] = useState(false);
  const activeStep = steps[activeIndex] ?? steps[0];
  const completedCount = steps.filter((step) => completed[step.id]).length;
  const progress = steps.length ? (completedCount / steps.length) * 100 : 0;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setCompleted(JSON.parse(stored) as Record<string, boolean>);
        }
      } catch {
        setCompleted({});
      } finally {
        setHasLoadedProgress(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!hasLoadedProgress) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    } catch {
      // Local progress is only a convenience for the admin workflow.
    }
  }, [completed, hasLoadedProgress]);

  function goToStep(index: number) {
    setActiveIndex(Math.max(0, Math.min(index, steps.length - 1)));
  }

  function setStepDone(stepId: string, done: boolean) {
    setCompleted((current) => ({
      ...current,
      [stepId]: done,
    }));
  }

  return (
    <section className={styles.workflowShell} id="profile-workflow">
      <header className={styles.workflowHeader}>
        <div>
          <p className={styles.eyebrow}>Profile Builder</p>
          <h2>Character setup flow</h2>
          {contextLabel ? (
            <p className={styles.workflowContext}>Editing {contextLabel}</p>
          ) : null}
        </div>
        <span>
          {completedCount}/{steps.length} filed
        </span>
      </header>

      <div className={styles.workflowProgress} aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className={styles.workflowLayout}>
        <ol className={styles.workflowSteps}>
          {steps.map((step, index) => (
            <li key={step.id}>
              <button
                type="button"
                data-active={index === activeIndex}
                data-complete={Boolean(completed[step.id])}
                onClick={() => goToStep(index)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step.title}</strong>
                <em>{step.optional ? "Optional" : "Required"}</em>
              </button>
            </li>
          ))}
        </ol>

        <div className={styles.workflowMain}>
          <div className={styles.workflowStepHeader}>
            <div>
              <span>{activeStep?.optional ? "Optional" : "Required"}</span>
              <h3>{activeStep?.title}</h3>
              <p>{activeStep?.description}</p>
            </div>
          </div>

          <div className={styles.workflowPanel}>{panels[activeIndex]}</div>

          <footer className={styles.workflowActions}>
            <button
              className={styles.secondaryButton}
              disabled={activeIndex === 0}
              onClick={() => goToStep(activeIndex - 1)}
              type="button"
            >
              Back
            </button>
            {activeStep ? (
              <button
                className={styles.secondaryButton}
                onClick={() =>
                  setStepDone(activeStep.id, !completed[activeStep.id])
                }
                type="button"
              >
                {completed[activeStep.id] ? "Mark open" : "Mark filed"}
              </button>
            ) : null}
            <button
              className={styles.submitButton}
              disabled={activeIndex >= steps.length - 1}
              onClick={() => goToStep(activeIndex + 1)}
              type="button"
            >
              Next
            </button>
          </footer>
        </div>
      </div>
    </section>
  );
}
