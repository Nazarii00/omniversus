import {
  CapabilityCategory,
  ConfidenceBand,
  ReviewStatus,
} from "@/generated/prisma/enums";

import type { VersionOption } from "../../data/loadAdminData";
import { enumValues } from "../../lib/enums";
import { addCapabilityAction } from "../../actions/dossierActions";
import styles from "../../styles/AdminPanel.module.css";
import { ActionFeedbackForm } from "../ActionFeedbackForm";
import {
  CheckboxField,
  EmptyState,
  EvidenceFields,
  Field,
  ScoreField,
  SelectField,
  SubmitButton,
  TextAreaField,
  VersionSelect,
} from "../FormControls";

export function CapabilityForm({
  selectedVersionId,
  versions,
}: {
  selectedVersionId?: string;
  versions: VersionOption[];
}) {
  return (
    <section className={styles.formPanel} id="capability">
      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>Fact</p>
        <h2>Capability</h2>
      </div>
      {!versions.length ? (
        <EmptyState>Create a subject version first.</EmptyState>
      ) : (
        <ActionFeedbackForm
          action={addCapabilityAction}
          className={styles.formGrid}
          pendingMessage="Adding capability..."
          resetOnSuccess
          successMessage="Capability added."
        >
          <VersionSelect
            defaultValue={selectedVersionId}
            versions={versions}
          />
          <SelectField
            label="Category"
            name="category"
            values={enumValues(CapabilityCategory)}
            defaultValue={CapabilityCategory.ATTACK_POTENCY}
          />
          <Field label="Subtype" name="subtype" placeholder="melee damage" />
          <Field label="Normalized tier" name="normalizedTier" />
          <TextAreaField label="Value text" name="valueText" required />
          <TextAreaField label="Context" name="context" />
          <TextAreaField label="Limitations" name="limitations" />
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
          <CheckboxField label="Contested" name="contested" />
          <TextAreaField label="Internal notes" name="notes" rows={2} />
          <EvidenceFields />
          <div className={styles.formFooter}>
            <SubmitButton>Add capability</SubmitButton>
          </div>
        </ActionFeedbackForm>
      )}
    </section>
  );
}
