"use client";

import { useState } from "react";

import type { LoadedAdminData } from "../data/loadAdminData";
import { EmptyState } from "./FormControls";
import styles from "../styles/AdminPanel.module.css";

type BattleRun = LoadedAdminData["recentRuns"][number];

type RegenerateState = {
  runId: string;
  status: "loading" | "success" | "error";
  message?: string;
};

export function RecentRuns({ runs }: { runs: BattleRun[] }) {
  const [jsonRunId, setJsonRunId] = useState<string | null>(null);
  const [regenerate, setRegenerate] = useState<RegenerateState | null>(null);
  const [regeneratedPayloads, setRegeneratedPayloads] = useState<
    Record<string, unknown>
  >({});

  const selectedRun = jsonRunId
    ? (runs.find((r) => r.id === jsonRunId) ?? null)
    : null;

  // Use regenerated payload if available, otherwise original
  const selectedPayload =
    selectedRun && regeneratedPayloads[selectedRun.id]
      ? regeneratedPayloads[selectedRun.id]
      : selectedRun?.resultPayload;

  async function handleRegenerate(runId: string) {
    setRegenerate({ runId, status: "loading" });
    try {
      const res = await fetch("/api/admin/regenerate-battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleRunId: runId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegenerate({
          runId,
          status: "error",
          message: data.error ?? "Regeneration failed",
        });
        return;
      }
      setRegenerate({ runId, status: "success" });
      setRegeneratedPayloads((prev) => ({
        ...prev,
        [runId]: { result: data.result, generation: data.generation },
      }));
      // Auto-open the JSON modal
      setJsonRunId(runId);
    } catch {
      setRegenerate({
        runId,
        status: "error",
        message: "Network error",
      });
    }
  }

  return (
    <section className={styles.section}>
      <h2>Recent battle runs</h2>
      {!runs.length ? (
        <EmptyState>No battle runs captured yet.</EmptyState>
      ) : (
        <div className={styles.tableShell}>
          <table>
            <thead>
              <tr>
                <th>Matchup</th>
                <th>Status</th>
                <th>Model</th>
                <th>Created</th>
                <th style={{ width: 1 }}>JSON</th>
                <th style={{ width: 1 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const isRegenerating =
                  regenerate?.runId === run.id &&
                  regenerate?.status === "loading";
                const regenError =
                  regenerate?.runId === run.id && regenerate?.status === "error"
                    ? regenerate.message
                    : null;
                const wasRegenerated =
                  regenerate?.runId === run.id &&
                  regenerate?.status === "success";

                return (
                  <tr key={run.id}>
                    <td>
                      {run.fighterAName} vs {run.fighterBName}
                    </td>
                    <td>{run.status}</td>
                    <td>{run.resolvedModel ?? run.requestedModel ?? "None"}</td>
                    <td>{run.createdAt.toLocaleString("en-US")}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.jsonButton}
                        onClick={() =>
                          setJsonRunId(jsonRunId === run.id ? null : run.id)
                        }
                      >
                        JSON
                      </button>
                    </td>
                    <td>
                      <div className={styles.regenerateCell}>
                        <button
                          type="button"
                          className={styles.regenerateButton}
                          disabled={isRegenerating}
                          onClick={() => handleRegenerate(run.id)}
                        >
                          {isRegenerating ? "..." : "Regen"}
                        </button>
                        {wasRegenerated && (
                          <span className={styles.regenerateSuccess}>✓</span>
                        )}
                        {regenError && (
                          <span
                            className={styles.regenerateError}
                            title={regenError}
                          >
                            ✗
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedRun && selectedPayload != null && (
        <JsonModal
          runId={selectedRun.id}
          fighterAName={selectedRun.fighterAName}
          fighterBName={selectedRun.fighterBName}
          payload={selectedPayload}
          onClose={() => setJsonRunId(null)}
        />
      )}
    </section>
  );
}

function JsonModal({
  runId,
  fighterAName,
  fighterBName,
  payload,
  onClose,
}: {
  runId: string;
  fighterAName: string;
  fighterBName: string;
  payload: unknown;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const jsonText = payload
    ? JSON.stringify(payload, null, 2)
    : "No result payload available.";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available
    }
  }

  return (
    <div
      className={styles.jsonModalBackdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={styles.jsonModal}
        role="dialog"
        aria-modal="true"
        aria-label="Battle result JSON"
      >
        <header className={styles.jsonModalHeader}>
          <div>
            <span className={styles.jsonModalEyebrow}>Raw Pipeline Output</span>
            <h3 className={styles.jsonModalTitle}>
              {fighterAName} vs {fighterBName}
            </h3>
            <span className={styles.jsonModalRunId}>{runId}</span>
          </div>
          <div className={styles.jsonModalActions}>
            <button
              type="button"
              className={styles.jsonModalCopyBtn}
              onClick={() => void handleCopy()}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              className={styles.jsonModalCloseBtn}
              onClick={onClose}
              aria-label="Close JSON view"
            >
              X
            </button>
          </div>
        </header>
        <pre className={styles.jsonModalCode}>{jsonText}</pre>
      </section>
    </div>
  );
}
