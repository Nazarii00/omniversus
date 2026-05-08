import {
  ConditionKind,
  ConditionType,
  ConfidenceBand,
  ReviewStatus,
} from "@/generated/prisma/enums";

import type { VersionOption } from "../../_data/loadAdminData";
import { enumValues } from "../../_lib/enums";
import { addConditionAction } from "../../_actions/dossierActions";
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

export function ConditionForm({ versions }: { versions: VersionOption[] }) {
  return (
    <section className={styles.formPanel} id="condition">
      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>Fact</p>
        <h2>Win/Loss condition</h2>
      </div>
      {!versions.length ? (
        <EmptyState>Create a subject version first.</EmptyState>
      ) : (
        <form action={addConditionAction} className={styles.formGrid}>
          <VersionSelect versions={versions} />
          <SelectField
            label="Kind"
            name="kind"
            values={enumValues(ConditionKind)}
            defaultValue={ConditionKind.WIN}
          />
          <SelectField
            label="Type"
            name="type"
            values={enumValues(ConditionType)}
            defaultValue={ConditionType.KO}
          />
          <TextAreaField label="Method" name="method" required />
          <TextAreaField label="Requires" name="requires" />
          <TextAreaField label="Blocked by" name="blockedBy" />
          <Field label="Probability note" name="probabilityText" />
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
            <SubmitButton>Add condition</SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}
