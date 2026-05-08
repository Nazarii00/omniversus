import {
  CanonScope,
  ConfidenceBand,
  OriginMedium,
  ReviewStatus,
  SubjectKind,
} from "@/generated/prisma/enums";

import { enumValues } from "../../_lib/enums";
import { saveSubjectVersionAction } from "../../_actions/dossierActions";
import styles from "../../page.module.css";
import {
  CheckboxField,
  Field,
  ScoreField,
  SelectField,
  SubmitButton,
  TextAreaField,
} from "../FormControls";

export function SubjectVersionForm() {
  return (
    <section className={styles.formPanel} id="subject-version">
      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>Identity</p>
        <h2>Subject and version</h2>
      </div>
      <form action={saveSubjectVersionAction} className={styles.formGrid}>
        <Field
          label="Display name"
          name="displayName"
          placeholder="Darth Vader"
          required
        />
        <Field label="Subject slug" name="subjectSlug" placeholder="auto" />
        <Field label="Canonical name" name="canonicalName" />
        <Field label="Origin" name="originName" placeholder="Star Wars" />
        <SelectField
          label="Kind"
          name="kind"
          values={enumValues(SubjectKind)}
          defaultValue={SubjectKind.FICTIONAL_CHARACTER}
        />
        <SelectField
          label="Medium"
          name="originMedium"
          values={enumValues(OriginMedium)}
          defaultValue={OriginMedium.MOVIE}
        />
        <Field label="Aliases" name="aliases" placeholder="The Shape, Vader" />
        <TextAreaField label="Subject summary" name="subjectSummary" />
        <Field label="Version label" name="versionLabel" required />
        <Field label="Version slug" name="versionSlug" placeholder="auto" />
        <SelectField
          label="Canon scope"
          name="canonScope"
          values={enumValues(CanonScope)}
          defaultValue={CanonScope.PRIMARY_CANON}
        />
        <Field label="Continuity" name="continuity" />
        <Field label="Era" name="era" />
        <Field label="Form" name="form" />
        <Field label="State" name="state" />
        <ScoreField defaultValue="60" />
        <SelectField
          label="Confidence band"
          name="confidenceBand"
          values={enumValues(ConfidenceBand)}
          defaultValue={ConfidenceBand.MEDIUM}
        />
        <SelectField
          label="Status"
          name="status"
          values={enumValues(ReviewStatus)}
          defaultValue={ReviewStatus.REQUIRES_REVIEW}
        />
        <TextAreaField label="Version summary" name="versionSummary" />
        <CheckboxField label="Make default version" name="isDefault" />
        <div className={styles.formFooter}>
          <SubmitButton>Save subject</SubmitButton>
        </div>
      </form>
    </section>
  );
}
