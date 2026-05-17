import {
  AbilityType,
  ConfidenceBand,
  ReviewStatus,
} from "@/generated/prisma/enums";

import type { VersionOption } from "../../data/loadAdminData";
import { enumValues } from "../../lib/enums";
import { addAbilityAction } from "../../actions/dossierActions";
import styles from "../../styles/AdminPanel.module.css";
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

export function AbilityForm({ versions }: { versions: VersionOption[] }) {
  return (
    <section className={styles.formPanel} id="ability">
      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>Fact</p>
        <h2>Ability</h2>
      </div>
      {!versions.length ? (
        <EmptyState>Create a subject version first.</EmptyState>
      ) : (
        <form action={addAbilityAction} className={styles.formGrid}>
          <VersionSelect versions={versions} />
          <Field label="Name" name="name" required />
          <SelectField
            label="Type"
            name="type"
            values={enumValues(AbilityType)}
            defaultValue={AbilityType.UTILITY}
          />
          <TextAreaField label="Description" name="description" required />
          <Field label="Activation" name="activation" />
          <Field label="Delivery" name="delivery" />
          <Field label="Range" name="rangeText" />
          <Field label="Timing" name="timing" />
          <Field label="Target requirement" name="targetRequirement" />
          <TextAreaField label="Effect" name="effect" />
          <TextAreaField label="Limitations" name="limitations" />
          <TextAreaField label="Counterplay" name="counterplay" />
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
          <CheckboxField label="Passive" name="isPassive" />
          <EvidenceFields />
          <div className={styles.formFooter}>
            <SubmitButton>Add ability</SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}
