"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addEquipmentAction,
  deleteEquipmentAction,
  updateEquipmentAction,
} from "../actions/dossierActions";
import styles from "../styles/AdminPanel.module.css";

type Item = {
  id: string;
  name: string;
  type: string;
  description: string;
  availabilityText: string | null;
  notes: string | null;
  status: string;
  confidenceScore: number;
  confidenceBand: string;
};

type Props = { versionId: string; equipment: Item[] };

export function EquipmentEditor({ versionId, equipment }: Props) {
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
      await deleteEquipmentAction(fd);
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
        await updateEquipmentAction(fd);
      } else {
        await addEquipmentAction(fd);
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
          <option value="WEAPON">Weapon</option>
          <option value="ARMOR">Armor</option>
          <option value="TOOL">Tool</option>
          <option value="CONSUMABLE">Consumable</option>
          <option value="VEHICLE">Vehicle</option>
          <option value="SUIT">Suit</option>
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
        <span>Availability</span>
        <input
          name="availabilityText"
          defaultValue={item?.availabilityText ?? ""}
          disabled={busy}
        />
      </label>
      <label className={styles.field}>
        <span>Notes</span>
        <input name="notes" defaultValue={item?.notes ?? ""} disabled={busy} />
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
      {equipment.length === 0 && !adding ? (
        <p className={styles.editableListEmpty}>No equipment yet.</p>
      ) : (
        <div className={styles.editableList}>
          {equipment.map((eq) => (
            <div
              key={eq.id}
              className={styles.editableListItem}
              data-expanded={expanded.has(eq.id) || editing?.id === eq.id}
            >
              <div
                className={styles.editableListRow}
                onClick={() => toggle(eq.id)}
              >
                <span className={styles.editableListChevron}>▶</span>
                <span className={styles.editableListTitle}>{eq.name}</span>
                <span className={styles.editableListBadge}>{eq.type}</span>
                <div
                  className={styles.editableListActions}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className={styles.editableListActionBtn}
                    disabled={busy}
                    onClick={() =>
                      setEditing(editing?.id === eq.id ? null : eq)
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${styles.editableListActionBtn} ${styles.editableListActionBtnDanger}`}
                    disabled={busy}
                    onClick={() => del(eq.id)}
                  >
                    Del
                  </button>
                </div>
              </div>
              {expanded.has(eq.id) && editing?.id !== eq.id && (
                <div className={styles.editableListDetails}>
                  <div className={styles.editableListDetailGrid}>
                    <div
                      className={`${styles.editableListDetailField} ${styles.wide}`}
                    >
                      <span className={styles.editableListDetailLabel}>
                        Description
                      </span>
                      <span className={styles.editableListDetailValue}>
                        {eq.description}
                      </span>
                    </div>
                    {eq.availabilityText && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Availability
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {eq.availabilityText}
                        </span>
                      </div>
                    )}
                    {eq.notes && (
                      <div className={styles.editableListDetailField}>
                        <span className={styles.editableListDetailLabel}>
                          Notes
                        </span>
                        <span className={styles.editableListDetailValue}>
                          {eq.notes}
                        </span>
                      </div>
                    )}
                    <div className={styles.editableListDetailField}>
                      <span className={styles.editableListDetailLabel}>
                        Confidence
                      </span>
                      <span className={styles.editableListDetailValue}>
                        {eq.confidenceBand} ({eq.confidenceScore})
                      </span>
                    </div>
                    <div className={styles.editableListDetailField}>
                      <span className={styles.editableListDetailLabel}>
                        Status
                      </span>
                      <span className={styles.editableListDetailValue}>
                        {eq.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {editing?.id === eq.id && (
                <form
                  className={styles.editableListEditForm}
                  onSubmit={(e) => submit(e, eq)}
                >
                  {fields(eq)}
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
            + Add Equipment
          </button>
        </div>
      )}
    </div>
  );
}

function err(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Action failed.";
}
