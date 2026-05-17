import { EquipmentCategory, ReviewStatus } from "@/generated/prisma/enums";

import type { VersionOption } from "../../data/loadAdminData";
import { enumValues } from "../../lib/enums";
import { addEquipmentAction } from "../../actions/dossierActions";
import styles from "../../styles/AdminPanel.module.css";
import {
  CheckboxField,
  EmptyState,
  EvidenceFields,
  Field,
  SelectField,
  SubmitButton,
  TextAreaField,
  VersionSelect,
} from "../FormControls";

export function EquipmentForm({ versions }: { versions: VersionOption[] }) {
  return (
    <section className={styles.formPanel} id="equipment">
      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>Fact</p>
        <h2>Equipment</h2>
      </div>
      {!versions.length ? (
        <EmptyState>Create a subject version first.</EmptyState>
      ) : (
        <form action={addEquipmentAction} className={styles.formGrid}>
          <VersionSelect versions={versions} />
          <Field label="Name" name="name" required />
          <SelectField
            label="Category"
            name="category"
            values={enumValues(EquipmentCategory)}
            defaultValue={EquipmentCategory.STANDARD_LOADOUT}
          />
          <TextAreaField label="Description" name="description" required />
          <Field label="Availability" name="availabilityPolicy" />
          <TextAreaField label="Limitations" name="limitations" />
          <SelectField
            label="Status"
            name="status"
            values={enumValues(ReviewStatus)}
            defaultValue={ReviewStatus.REQUIRES_REVIEW}
          />
          <CheckboxField label="Standard loadout" name="standard" />
          <EvidenceFields />
          <div className={styles.formFooter}>
            <SubmitButton>Add equipment</SubmitButton>
          </div>
        </form>
      )}
    </section>
  );
}
