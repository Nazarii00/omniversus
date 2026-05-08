import { ConfidenceBand, ReviewStatus } from "@/generated/prisma/enums";

import type { VersionOption } from "../../_data/loadAdminData";
import { enumValues } from "../../_lib/enums";
import { addWeaknessAction } from "../../_actions/dossierActions";
import styles from "../../page.module.css";
import {
  EmptyState,
  EvidenceFields,
  Field,
  ScoreField,
  SelectField,
  SubmitButton,
  TextAreaField,
  VersionSelect,
} from "../FormControls";

export function WeaknessForm({ versions }: { versions: VersionOption[] }) {
  return (
    <section className={styles.formPanel} id="weakness">
      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>Fact</p>
        <h2>Weakness</h2>
      </div>
      {!versions.length ? (
        <EmptyState>Create a subject version first.</EmptyState>
      ) : (
        <form action={addWeaknessAction} className={styles.formGrid}>
          <VersionSelect versions={versions} />
          <Field label="Name" name="name" required />
          <TextAreaField label="Description" name="description" required />
          <TextAreaField label="Exploitation" name="exploitation" />
          <SelectField
            label="Severity"
            name="severity"
            values={enumValues(ConfidenceBand)}
            defaultValue={ConfidenceBand.MEDIUM}
          />
          <ScoreField />
          <SelectField
            label="Status"
            name="status"
            values={enumValues(ReviewStatus)}
            defaultValue={ReviewStatus.REQUIRES_REVIEW}
          />
          <SelectField
            label="Confidence band"
            name="confidenceBand"
            values={enumValues(ConfidenceBand)}
            defaultValue={ConfidenceBand.MEDIUM}
          />
          <EvidenceFields />
          <div className={styles.formFooter}>
            <SubmitButton>Add weakness</SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}
