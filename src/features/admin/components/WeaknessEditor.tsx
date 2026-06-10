"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  addWeaknessAction,
  deleteWeaknessAction,
  updateWeaknessAction,
} from "../actions/dossierActions";

import styles from "../styles/AdminPanel.module.css";

type WeaknessItem = {
  id: string;
  name: string;
  description: string;
  exploitation: string | null;
  severity: string;
  status: string;
  confidenceScore: number;
  confidenceBand: string;
};

type Props = { versionId: string; weaknesses: WeaknessItem[] };

export function WeaknessEditor({ versionId, weaknesses }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<WeaknessItem | null>(null);
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
      await deleteWeaknessAction(fd);
      setFb({ message: "Deleted.", tone: "success" });
      router.refresh();
    } catch (e) {
      setFb({ message: err(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const submit = async (
    e: FormEvent<HTMLFormElement>,
    item: WeaknessItem | null,
  ) => {
    e.preventDefault();
    setBusy(true);
    setFb({ message: "Saving...", tone: "pending" });
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("versionId", versionId);
      if (item) {
        fd.set("id", item.id);
        await updateWeaknessAction(fd);
      } else {
        await addWeaknessAction(fd);
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

  const fields = (item: WeaknessItem | null) => (
    <div className={styles.editableListEditFormGrid}>
      <label className={styles.field}>
        <span>Name</span>
        <input
          name="name"
          defaultValue={item?.name ?? ""}
          required
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Severity</span>
        <select
          name="severity"
          defaultValue={item?.severity ?? "MEDIUM"}
          disabled={busy}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </label>
      <label className={`${styles.field} ${styles.wide}`}>
        <span>Description</span>
        <textarea
          name="description"
          defaultValue={item?.description ?? ""}
          required
          rows={2}
          disabled={busy}
        />
      </label>
      <label className={`${styles.field} ${styles.wide}`}>
        <span>Exploitation</span>
        <textarea
          name="exploitation"
          defaultValue={item?.exploitation ?? ""}
          rows={2}
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
      {weaknesses.length === 0 && !adding ? (
        <p className={styles.editableListEmpty}>No weaknesses yet.</p>
      ) : (
        <div className={styles.editableList}>
          {weaknesses.map((w) => (
            <div
              key={w.id}
              className={styles.editableListItem}
              data-expanded={expanded.has(w.id) || editing?.id === w.id}
            >
              <div
                className={styles.editableListRow}
                onClick={() => toggle(w.id)}
              >
                <span className={styles.editableListChevron}>▶</span>
                <span className={styles.editableListTitle}>{w.name}</span>
                <span className={styles.editableListBadge}>{w.severity}</span>
                <div
                  className={styles.editableListActions}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className={styles.editableListActionBtn}
                    disabled={busy}
                    onClick={() => setEditing(editing?.id === w.id ? null : w)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${styles.editableListActionBtn} ${styles.editableListActionBtnDanger}`}
                    disabled={busy}
                    onClick={() => del(w.id)}
                  >
                    Del
                  </button>
                </div>
              </div>
              {expanded.has(w.id) && editing?.id !== w.id && (
                <div className={styles.editableListDetails}>
                  <div className={styles.editableListDetailGrid}>
                    <div
                      className={`${styles.editableListDetailField} ${styles.wide}`}
                    >
                      <span className={styles.editableListDetailLabel}>
                        Description
                      </span>
                      <span className={styles.editableListDetailValue}>
                        {w.description}
                      </span>
                    </div>
                    {w.exploitation && (
                      <div
                        className={`${styles.editableListDetailField} ${styles.wide}`}
                      >
                        <span className={styles.editableListDetailLabel}>
                          Exploitation
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {w.exploitation}
                        </span>
                      </div>
                    )}
                    <div className={styles.editableListDetailField}>
                      <span className={styles.editableListDetailLabel}>
                        Confidence
                      </span>
                      <span className={styles.editableListDetailValue}>
                        {w.confidenceBand} ({w.confidenceScore})
                      </span>
                    </div>
                    <div className={styles.editableListDetailField}>
                      <span className={styles.editableListDetailLabel}>
                        Status
                      </span>
                      <span className={styles.editableListDetailValue}>
                        {w.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {editing?.id === w.id && (
                <form
                  className={styles.editableListEditForm}
                  onSubmit={(e) => submit(e, w)}
                >
                  {fields(w)}
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
            + Add Weakness
          </button>
        </div>
      )}
    </div>
  );
}

function err(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Action failed.";
}
