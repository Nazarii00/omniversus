import {
  CanonScope,
  ConfidenceBand,
  OriginMedium,
  ReviewStatus,
  SubjectKind,
} from "@/generated/prisma/enums";

import type { VersionOption } from "../../data/loadAdminData";
import { enumValues } from "../../lib/enums";
import { saveSubjectVersionAction } from "../../actions/dossierActions";
import styles from "../../styles/AdminPanel.module.css";
import { ActionFeedbackForm } from "../ActionFeedbackForm";
import {
  CheckboxField,
  Field,
  ScoreField,
  SelectField,
  SubmitButton,
  TextAreaField,
} from "../FormControls";

export function SubjectVersionForm({
  selectedVersion,
}: {
  selectedVersion?: VersionOption | null;
}) {
  const subject = selectedVersion?.subject;
  const aliases = subject?.aliases.map((alias) => alias.value).join(", ");

  return (
    <section className={styles.formPanel} id="subject-version">
      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>Identity</p>
        <h2>
          {selectedVersion
            ? `Edit ${subject?.displayName} / ${selectedVersion.label}`
            : "Subject and version"}
        </h2>
      </div>
      <ActionFeedbackForm
        action={saveSubjectVersionAction}
        className={styles.formGrid}
        pendingMessage="Saving profile..."
        refreshOnSuccess
        successMessage={
          selectedVersion ? "Selected profile saved." : "Subject saved."
        }
      >
        <Field
          label="Display name"
          name="displayName"
          placeholder="Darth Vader"
          required
          defaultValue={subject?.displayName}
        />
        <Field
          label="Subject slug"
          name="subjectSlug"
          placeholder="auto"
          defaultValue={subject?.slug}
        />
        <Field
          label="Canonical name"
          name="canonicalName"
          defaultValue={subject?.canonicalName}
        />
        <Field
          label="Origin"
          name="originName"
          placeholder="Star Wars"
          defaultValue={subject?.originName ?? undefined}
        />
        <SelectField
          label="Kind"
          name="kind"
          values={enumValues(SubjectKind)}
          defaultValue={subject?.kind ?? SubjectKind.FICTIONAL_CHARACTER}
        />
        <SelectField
          label="Medium"
          name="originMedium"
          values={enumValues(OriginMedium)}
          defaultValue={subject?.originMedium ?? OriginMedium.MOVIE}
        />
        <Field
          label="Aliases"
          name="aliases"
          placeholder="The Shape, Vader"
          defaultValue={aliases}
        />
        <TextAreaField
          label="Subject summary"
          name="subjectSummary"
          defaultValue={subject?.summary ?? undefined}
        />
        <Field
          label="Version label"
          name="versionLabel"
          required
          defaultValue={selectedVersion?.label}
        />
        <Field
          label="Version slug"
          name="versionSlug"
          placeholder="auto"
          defaultValue={selectedVersion?.slug}
        />
        <SelectField
          label="Canon scope"
          name="canonScope"
          values={enumValues(CanonScope)}
          defaultValue={selectedVersion?.canonScope ?? CanonScope.PRIMARY_CANON}
        />
        <Field
          label="Continuity"
          name="continuity"
          defaultValue={selectedVersion?.continuity ?? undefined}
        />
        <Field
          label="Era"
          name="era"
          defaultValue={selectedVersion?.era ?? undefined}
        />
        <Field
          label="Form"
          name="form"
          defaultValue={selectedVersion?.form ?? undefined}
        />
        <Field
          label="State"
          name="state"
          defaultValue={selectedVersion?.state ?? undefined}
        />
        <ScoreField
          defaultValue={String(selectedVersion?.confidenceScore ?? 60)}
        />
        <SelectField
          label="Confidence band"
          name="confidenceBand"
          values={enumValues(ConfidenceBand)}
          defaultValue={selectedVersion?.confidenceBand ?? ConfidenceBand.MEDIUM}
        />
        <SelectField
          label="Status"
          name="status"
          values={enumValues(ReviewStatus)}
          defaultValue={selectedVersion?.status ?? ReviewStatus.REQUIRES_REVIEW}
        />
        <TextAreaField
          label="Version summary"
          name="versionSummary"
          defaultValue={selectedVersion?.summary ?? undefined}
        />
        <CheckboxField
          label="Make default version"
          name="isDefault"
          defaultChecked={Boolean(selectedVersion?.isDefault)}
        />
        <div className={styles.formFooter}>
          <SubmitButton>
            {selectedVersion ? "Save selected profile" : "Save subject"}
          </SubmitButton>
        </div>
      </ActionFeedbackForm>
    </section>
  );
}
