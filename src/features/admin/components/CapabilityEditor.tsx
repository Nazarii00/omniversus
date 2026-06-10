"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  addCapabilityAction,
  deleteCapabilityAction,
  updateCapabilityAction,
} from "../actions/dossierActions";

import styles from "../styles/AdminPanel.module.css";

type CapabilityItem = {
  id: string;
  category: string;
  subtype: string | null;
  valueText: string;
  normalizedTier: string | null;
  context: string | null;
  limitations: string | null;
  contested: boolean;
  notes: string | null;
  status: string;
  confidenceScore: number;
  confidenceBand: string;
};

type Props = { versionId: string; capabilities: CapabilityItem[] };

export function CapabilityEditor({ versionId, capabilities }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<CapabilityItem | null>(null);
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
      await deleteCapabilityAction(fd);
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
    item: CapabilityItem | null,
  ) => {
    e.preventDefault();
    setBusy(true);
    setFb({ message: "Saving...", tone: "pending" });
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("versionId", versionId);
      if (item) {
        fd.set("id", item.id);
        await updateCapabilityAction(fd);
      } else {
        await addCapabilityAction(fd);
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

  const fields = (item: CapabilityItem | null) => (
    <div className={styles.editableListEditFormGrid}>
      <label className={styles.field}>
        <span>Category</span>
        <select
          name="category"
          defaultValue={item?.category ?? "OTHER"}
          disabled={busy}
        >
          <option value="OTHER">Other</option>
          <option value="STRENGTH">Strength</option>
          <option value="SPEED">Speed</option>
          <option value="DURABILITY">Durability</option>
          <option value="INTELLIGENCE">Intelligence</option>
          <option value="SKILL">Skill</option>
          <option value="POWER">Power</option>
          <option value="HAX">Hax</option>
          <option value="EXPERIENCE">Experience</option>
        </select>
      </label>
      <label className={styles.field}>
        <span>Subtype</span>
        <input
          name="subtype"
          defaultValue={item?.subtype ?? ""}
          disabled={busy}
        />
      </label>
      <label className={`${styles.field} ${styles.wide}`}>
        <span>Value</span>
        <input
          name="valueText"
          defaultValue={item?.valueText ?? ""}
          required
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Normalized Tier</span>
        <input
          name="normalizedTier"
          defaultValue={item?.normalizedTier ?? ""}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Context</span>
        <input
          name="context"
          defaultValue={item?.context ?? ""}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Limitations</span>
        <input
          name="limitations"
          defaultValue={item?.limitations ?? ""}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Notes</span>
        <input name="notes" defaultValue={item?.notes ?? ""} disabled={busy} />
      </label>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          name="contested"
          defaultChecked={item?.contested ?? false}
          disabled={busy}
        />
        <span>Contested</span>
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
      {capabilities.length === 0 && !adding ? (
        <p className={styles.editableListEmpty}>No capabilities yet.</p>
      ) : (
        <div className={styles.editableList}>
          {capabilities.map((c) => (
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
                <span className={styles.editableListTitle}>{c.valueText}</span>
                <span className={styles.editableListBadge}>
                  {c.category}
                  {c.contested ? " ⚡" : ""}
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
                    {c.subtype && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Subtype
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {c.subtype}
                        </span>
                      </div>
                    )}
                    {c.normalizedTier && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Tier
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {c.normalizedTier}
                        </span>
                      </div>
                    )}
                    {c.context && (
                      <div
                        className={`${styles.editableListDetailField} ${styles.wide}`}
                      >
                        <span className={styles.editableListDetailLabel}>
                          Context
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {c.context}
                        </span>
                      </div>
                    )}
                    {c.limitations && (
                      <div
                        className={`${styles.editableListDetailField} ${styles.wide}`}
                      >
                        <span className={styles.editableListDetailLabel}>
                          Limitations
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {c.limitations}
                        </span>
                      </div>
                    )}
                    {c.notes && (
                      <div
                        className={`${styles.editableListDetailField} ${styles.wide}`}
                      >
                        <span className={styles.editableListDetailLabel}>
                          Notes
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {c.notes}
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
            + Add Capability
          </button>
        </div>
      )}
    </div>
  );
}

function err(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Action failed.";
}
