import { ConfidenceBand, ReviewStatus } from "@/generated/prisma/enums";

import type { VersionOption } from "../../data/loadAdminData";
import { enumValues } from "../../lib/enums";
import { addWeaknessAction } from "../../actions/dossierActions";
import styles from "../../styles/AdminPanel.module.css";
import { ActionFeedbackForm } from "../ActionFeedbackForm";
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

export function WeaknessForm({
  selectedVersionId,
  versions,
}: {
  selectedVersionId?: string;
  versions: VersionOption[];
}) {
  return (
    <section className={styles.formPanel} id="weakness">
      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>Fact</p>
        <h2>Weakness</h2>
      </div>
      {!versions.length ? (
        <EmptyState>Create a subject version first.</EmptyState>
      ) : (
        <ActionFeedbackForm
          action={addWeaknessAction}
          className={styles.formGrid}
          pendingMessage="Adding weakness..."
          resetOnSuccess
          successMessage="Weakness added."
        >
          <VersionSelect
            defaultValue={selectedVersionId}
            versions={versions}
          />
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
        </ActionFeedbackForm>
      )}
    </section>
  );
}
