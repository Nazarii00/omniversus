import type { VersionOption } from "../data/loadAdminData";
import styles from "../styles/AdminPanel.module.css";

export function Field({
  label,
  name,
  placeholder,
  required = false,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
      />
    </label>
  );
}

export function TextAreaField({
  label,
  name,
  placeholder,
  required = false,
  rows = 3,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label className={`${styles.field} ${styles.wide}`}>
      <span>{label}</span>
      <textarea
        name={name}
        placeholder={placeholder}
        required={required}
        rows={rows}
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  values,
  defaultValue,
}: {
  label: string;
  name: string;
  values: string[];
  defaultValue?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue ?? values[0]}>
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}

export function VersionSelect({
  versions,
  label = "Version",
}: {
  versions: VersionOption[];
  label?: string;
}) {
  return (
    <label className={`${styles.field} ${styles.wide}`}>
      <span>{label}</span>
      <select name="versionId" required>
        <option value="">Select version</option>
        {versions.map((version) => (
          <option key={version.id} value={version.id}>
            {version.subject.displayName} / {version.label} /{" "}
            {version.canonScope}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ScoreField({ defaultValue = "60" }: { defaultValue?: string }) {
  return (
    <label className={styles.field}>
      <span>Confidence</span>
      <input
        name="confidenceScore"
        type="number"
        min="0"
        max="100"
        defaultValue={defaultValue}
      />
    </label>
  );
}

export function EvidenceFields() {
  return (
    <fieldset className={`${styles.fieldset} ${styles.wide}`}>
      <legend>Evidence</legend>
      <Field
        label="Source title"
        name="sourceTitle"
        placeholder="Manual note, issue, wiki page..."
      />
      <Field label="Source URL" name="sourceUrl" placeholder="https://..." />
      <TextAreaField
        label="Citation"
        name="sourceCitation"
        placeholder="Short source reference"
        rows={2}
      />
      <TextAreaField
        label="Evidence note"
        name="evidenceNote"
        placeholder="Why this source supports the fact"
        rows={2}
      />
      <label className={styles.field}>
        <span>Relevance</span>
        <input
          name="relevanceScore"
          type="number"
          min="0"
          max="100"
          defaultValue="70"
        />
      </label>
    </fieldset>
  );
}

export function CheckboxField({
  label,
  name,
}: {
  label: string;
  name: string;
}) {
  return (
    <label className={styles.checkbox}>
      <input name={name} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button className={styles.submitButton} type="submit">
      {children}
    </button>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}
