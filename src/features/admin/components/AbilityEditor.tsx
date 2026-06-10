"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  addAbilityAction,
  deleteAbilityAction,
  updateAbilityAction,
} from "../actions/dossierActions";

import styles from "../styles/AdminPanel.module.css";

// ─── Types ────────────────────────────────────────────────────────────────

type AbilityItem = {
  id: string;
  versionId: string;
  name: string;
  type: string;
  description: string;
  activation: string | null;
  delivery: string | null;
  rangeText: string | null;
  timing: string | null;
  targetRequirement: string | null;
  effect: string | null;
  limitations: string | null;
  counterplay: string | null;
  isPassive: boolean;
  status: string;
  confidenceScore: number;
  confidenceBand: string;
};

type AbilityEditorProps = {
  versionId: string;
  abilities: AbilityItem[];
};

// ─── Component ────────────────────────────────────────────────────────────

export function AbilityEditor({ versionId, abilities }: AbilityEditorProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<AbilityItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "idle" | "pending" | "success" | "error";
  }>({ message: "", tone: "idle" });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this ability?")) return;
    setBusy(true);
    setFeedback({ message: "Deleting...", tone: "pending" });
    try {
      const fd = new FormData();
      fd.set("id", id);
      await deleteAbilityAction(fd);
      setFeedback({ message: "Deleted.", tone: "success" });
      router.refresh();
    } catch (e) {
      setFeedback({ message: errorMsg(e), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
    item: AbilityItem | null,
  ) => {
    e.preventDefault();
    setBusy(true);
    setFeedback({ message: "Saving...", tone: "pending" });
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("versionId", versionId);
      if (item) {
        fd.set("id", item.id);
        await updateAbilityAction(fd);
      } else {
        await addAbilityAction(fd);
      }
      setFeedback({ message: "Saved.", tone: "success" });
      setEditing(null);
      setAdding(false);
      router.refresh();
    } catch (err) {
      setFeedback({ message: errorMsg(err), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const closeForm = () => {
    setEditing(null);
    setAdding(false);
  };

  const formFields = (item: AbilityItem | null) => (
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
        <span>Type</span>
        <select
          name="type"
          defaultValue={item?.type ?? "OTHER"}
          disabled={busy}
        >
          <option value="OTHER">Other</option>
          <option value="OFFENSIVE">Offensive</option>
          <option value="DEFENSIVE">Defensive</option>
          <option value="MOBILITY">Mobility</option>
          <option value="SUPPORT">Support</option>
          <option value="UTILITY">Utility</option>
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
      <label className={styles.field}>
        <span>Activation</span>
        <input
          name="activation"
          defaultValue={item?.activation ?? ""}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Delivery</span>
        <input
          name="delivery"
          defaultValue={item?.delivery ?? ""}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Range</span>
        <input
          name="rangeText"
          defaultValue={item?.rangeText ?? ""}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Timing</span>
        <input
          name="timing"
          defaultValue={item?.timing ?? ""}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Target Requirement</span>
        <input
          name="targetRequirement"
          defaultValue={item?.targetRequirement ?? ""}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Effect</span>
        <input
          name="effect"
          defaultValue={item?.effect ?? ""}
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
        <span>Counterplay</span>
        <input
          name="counterplay"
          defaultValue={item?.counterplay ?? ""}
          disabled={busy}
        />
      </label>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          name="isPassive"
          defaultChecked={item?.isPassive ?? false}
          disabled={busy}
        />
        <span>Passive</span>
      </label>
      <label className={styles.field}>
        <span>Confidence Score</span>
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
      {feedback.tone !== "idle" && (
        <p className={styles.actionFeedback} data-tone={feedback.tone}>
          {feedback.message}
        </p>
      )}

      {abilities.length === 0 && !adding ? (
        <p className={styles.editableListEmpty}>No abilities yet.</p>
      ) : (
        <div className={styles.editableList}>
          {abilities.map((a) => (
            <div
              key={a.id}
              className={styles.editableListItem}
              data-expanded={expanded.has(a.id) || editing?.id === a.id}
            >
              <div
                className={styles.editableListRow}
                onClick={() => toggle(a.id)}
              >
                <span className={styles.editableListChevron}>▶</span>
                <span className={styles.editableListTitle}>{a.name}</span>
                {a.type && (
                  <span className={styles.editableListBadge}>{a.type}</span>
                )}
                <div
                  className={styles.editableListActions}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className={styles.editableListActionBtn}
                    disabled={busy}
                    onClick={() => setEditing(editing?.id === a.id ? null : a)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${styles.editableListActionBtn} ${styles.editableListActionBtnDanger}`}
                    disabled={busy}
                    onClick={() => handleDelete(a.id)}
                  >
                    Del
                  </button>
                </div>
              </div>

              {expanded.has(a.id) && editing?.id !== a.id && (
                <div className={styles.editableListDetails}>
                  <div className={styles.editableListDetailGrid}>
                    {a.description && (
                      <div
                        className={`${styles.editableListDetailField} ${styles.wide}`}
                      >
                        <span className={styles.editableListDetailLabel}>
                          Description
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {a.description}
                        </span>
                      </div>
                    )}
                    {a.activation && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Activation
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {a.activation}
                        </span>
                      </div>
                    )}
                    {a.delivery && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Delivery
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {a.delivery}
                        </span>
                      </div>
                    )}
                    {a.rangeText && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Range
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {a.rangeText}
                        </span>
                      </div>
                    )}
                    {a.timing && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Timing
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {a.timing}
                        </span>
                      </div>
                    )}
                    {a.effect && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Effect
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {a.effect}
                        </span>
                      </div>
                    )}
                    {a.limitations && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Limitations
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {a.limitations}
                        </span>
                      </div>
                    )}
                    {a.counterplay && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Counterplay
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {a.counterplay}
                        </span>
                      </div>
                    )}
                    <div className={styles.editableListDetailField}>
                      <span className={styles.editableListDetailLabel}>
                        Confidence
                      </span>
                      <span className={styles.editableListDetailValue}>
                        {a.confidenceBand} ({a.confidenceScore})
                      </span>
                    </div>
                    <div className={styles.editableListDetailField}>
                      <span className={styles.editableListDetailLabel}>
                        Status
                      </span>
                      <span className={styles.editableListDetailValue}>
                        {a.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {editing?.id === a.id && (
                <form
                  className={styles.editableListEditForm}
                  onSubmit={(e) => handleSubmit(e, a)}
                >
                  {formFields(a)}
                  <div className={styles.editableListEditFormActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={busy}
                      onClick={closeForm}
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
          onSubmit={(e) => handleSubmit(e, null)}
        >
          {formFields(null)}
          <div className={styles.editableListEditFormActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy}
              onClick={closeForm}
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
            + Add Ability
          </button>
        </div>
      )}
    </div>
  );
}

function errorMsg(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return "Action failed.";
}
