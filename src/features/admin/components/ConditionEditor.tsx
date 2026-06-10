"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addConditionAction,
  deleteConditionAction,
  updateConditionAction,
} from "../actions/dossierActions";
import styles from "../styles/AdminPanel.module.css";

type Item = {
  id: string;
  kind: string;
  type: string;
  method: string;
  requires: string | null;
  blockedBy: string | null;
  probabilityText: string | null;
  status: string;
  confidenceScore: number;
  confidenceBand: string;
};

type Props = { versionId: string; conditions: Item[] };

export function ConditionEditor({ versionId, conditions }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Item | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState<{
    message: string;
    tone: "idle" | "pending" | "success" | "error";
  }>({ message: "", tone: "idle" });

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    setBusy(true);
    setFb({ message: "Deleting...", tone: "pending" });
    try {
      const fd = new FormData();
      fd.set("id", id);
      await deleteConditionAction(fd);
      setFb({ message: "Deleted.", tone: "success" });
      router.refresh();
    } catch (e) {
      setFb({ message: err(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>, item: Item | null) => {
    e.preventDefault();
    setBusy(true);
    setFb({ message: "Saving...", tone: "pending" });
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("versionId", versionId);
      if (item) {
        fd.set("id", item.id);
        await updateConditionAction(fd);
      } else {
        await addConditionAction(fd);
      }
      setFb({ message: "Saved.", tone: "success" });
      setEditing(null);
      setAdding(false);
      router.refresh();
    } catch (er) {
      setFb({ message: err(er), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setEditing(null);
    setAdding(false);
  };

  const fields = (item: Item | null) => (
    <div className={styles.editableListEditFormGrid}>
      <label className={styles.field}>
        <span>Kind</span>
        <select name="kind" defaultValue={item?.kind ?? "WIN"} disabled={busy}>
          <option value="WIN">Win</option>
          <option value="LOSS">Loss</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>Type</span>
        <select
          name="type"
          defaultValue={item?.type ?? "OTHER"}
          disabled={busy}
        >
          <option value="OTHER">Other</option>
          <option value="KNOCKOUT">Knockout</option>
          <option value="INCAPACITATION">Incapacitation</option>
          <option value="RING_OUT">Ring Out</option>
          <option value="SUBMISSION">Submission</option>
          <option value="TIME_OUT">Time Out</option>
          <option value="DEATH">Death</option>
        </select>
      </label>
      <label className={`${styles.field} ${styles.wide}`}>
        <span>Method</span>
        <input
          name="method"
          defaultValue={item?.method ?? ""}
          required
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Requires</span>
        <input
          name="requires"
          defaultValue={item?.requires ?? ""}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Blocked By</span>
        <input
          name="blockedBy"
          defaultValue={item?.blockedBy ?? ""}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Probability</span>
        <input
          name="probabilityText"
          defaultValue={item?.probabilityText ?? ""}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Confidence</span>
        <input
          type="range"
          name="confidenceScore"
          min={0}
          max={100}
          defaultValue={item?.confidenceScore ?? 50}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Status</span>
        <select
          name="status"
          defaultValue={item?.status ?? "REQUIRES_REVIEW"}
          disabled={busy}
        >
          <option value="REQUIRES_REVIEW">Requires Review</option>
          <option value="VERIFIED">Verified</option>
          <option value="CONTESTED">Contested</option>
        </select>
      </label>
    </div>
  );

  return (
    <div>
      {fb.tone !== "idle" && (
        <p className={styles.actionFeedback} data-tone={fb.tone}>
          {fb.message}
        </p>
      )}
      {conditions.length === 0 && !adding ? (
        <p className={styles.editableListEmpty}>No conditions yet.</p>
      ) : (
        <div className={styles.editableList}>
          {conditions.map((c) => (
            <div
              key={c.id}
              className={styles.editableListItem}
              data-expanded={expanded.has(c.id) || editing?.id === c.id}
            >
              <div
                className={styles.editableListRow}
                onClick={() => toggle(c.id)}
              >
                <span className={styles.editableListChevron}>▶</span>
                <span className={styles.editableListTitle}>{c.method}</span>
                <span className={styles.editableListBadge}>
                  {c.kind} · {c.type}
                </span>
                <div
                  className={styles.editableListActions}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className={styles.editableListActionBtn}
                    disabled={busy}
                    onClick={() => setEditing(editing?.id === c.id ? null : c)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${styles.editableListActionBtn} ${styles.editableListActionBtnDanger}`}
                    disabled={busy}
                    onClick={() => del(c.id)}
                  >
                    Del
                  </button>
                </div>
              </div>
              {expanded.has(c.id) && editing?.id !== c.id && (
                <div className={styles.editableListDetails}>
                  <div className={styles.editableListDetailGrid}>
                    {c.requires && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Requires
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {c.requires}
                        </span>
                      </div>
                    )}
                    {c.blockedBy && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Blocked By
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {c.blockedBy}
                        </span>
                      </div>
                    )}
                    {c.probabilityText && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Probability
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {c.probabilityText}
                        </span>
                      </div>
                    )}
                    <div className={styles.editableListDetailField}>
                      <span className={styles.editableListDetailLabel}>
                        Confidence
                      </span>
                      <span className={styles.editableListDetailValue}>
                        {c.confidenceBand} ({c.confidenceScore})
                      </span>
                    </div>
                    <div className={styles.editableListDetailField}>
                      <span className={styles.editableListDetailLabel}>
                        Status
                      </span>
                      <span className={styles.editableListDetailValue}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {editing?.id === c.id && (
                <form
                  className={styles.editableListEditForm}
                  onSubmit={(e) => submit(e, c)}
                >
                  {fields(c)}
                  <div className={styles.editableListEditFormActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={busy}
                      onClick={close}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={busy}
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
      {adding && (
        <form
          className={styles.editableListEditForm}
          style={{
            border: "1px solid #242424",
            borderRadius: 7,
            background: "#090909",
            marginTop: "0.55rem",
            padding: "0.78rem 0.85rem",
          }}
          onSubmit={(e) => submit(e, null)}
        >
          {fields(null)}
          <div className={styles.editableListEditFormActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy}
              onClick={close}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={busy}
            >
              Add
            </button>
          </div>
        </form>
      )}
      {!adding && (
        <div className={styles.editableListAddBar}>
          <button
            type="button"
            className={styles.editableListAddBtn}
            disabled={busy}
            onClick={() => setAdding(true)}
          >
            + Add Condition
          </button>
        </div>
      )}
    </div>
  );
}

function err(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Action failed.";
}
