import { loadVersionDetail } from "../../data/versionDetailLoader";
import type { VersionOption } from "../../data/loadAdminData";
import { AbilityEditor } from "../AbilityEditor";
import { CapabilityEditor } from "../CapabilityEditor";
import { ConditionEditor } from "../ConditionEditor";
import { EquipmentEditor } from "../EquipmentEditor";
import { FeatEditor } from "../FeatEditor";
import { WeaknessEditor } from "../WeaknessEditor";
import { AbilityForm } from "./AbilityForm";
import { CapabilityForm } from "./CapabilityForm";
import { ConditionForm } from "./ConditionForm";
import { EquipmentForm } from "./EquipmentForm";
import { FormWorkflowShell, type FormWorkflowStep } from "./FormWorkflowShell";
import {
  SubjectPortraitStudio,
  type PortraitVersionOption,
} from "./SubjectPortraitStudio";
import { SubjectVersionForm } from "./SubjectVersionForm";
import { WeaknessForm } from "./WeaknessForm";
import styles from "../../styles/AdminPanel.module.css";

const PROFILE_STEPS: FormWorkflowStep[] = [
  {
    description: "Create the subject and the playable / versioned profile.",
    id: "identity",
    title: "Identity",
  },
  {
    description: "Approve the dossier portrait used by reports and artifacts.",
    id: "portrait",
    optional: true,
    title: "Portrait",
  },
  {
    description:
      "File the core AP, speed, durability, range, and stamina facts.",
    id: "capability",
    optional: true,
    title: "Capabilities",
  },
  {
    description:
      "File abilities, activation conditions, delivery, and counterplay.",
    id: "ability",
    optional: true,
    title: "Abilities",
  },
  {
    description: "File weaknesses, limits, and exploitation routes.",
    id: "weakness",
    optional: true,
    title: "Weaknesses",
  },
  {
    description: "File win and loss conditions for matchup reasoning.",
    id: "condition",
    optional: true,
    title: "Win / Loss",
  },
  {
    description: "File standard equipment and availability rules.",
    id: "equipment",
    optional: true,
    title: "Equipment",
  },
  {
    description: "File recorded feats tied to this version.",
    id: "feat",
    optional: true,
    title: "Feats",
  },
];

type Props = {
  isAddingSubject?: boolean;
  selectedVersion?: VersionOption | null;
  versions: VersionOption[];
};

export async function DossierForms({
  isAddingSubject = false,
  selectedVersion,
  versions,
}: Props) {
  const portraitVersions = versions.map(toPortraitVersion);
  const selectedVersionId = selectedVersion?.id;

  let detail = null;
  if (selectedVersionId) {
    detail = await loadVersionDetail(selectedVersionId);
  }

  return (
    <FormWorkflowShell
      contextLabel={
        selectedVersion
          ? `${selectedVersion.subject.displayName} / ${selectedVersion.label}`
          : isAddingSubject
            ? "New character"
            : undefined
      }
      steps={PROFILE_STEPS}
    >
      {/* 0: Identity */}
      <SubjectVersionForm selectedVersion={selectedVersion} />

      {/* 1: Portrait */}
      <SubjectPortraitStudio
        selectedVersionId={selectedVersionId}
        versions={portraitVersions}
      />

      {/* 2: Capability — form + read-only list */}
      <div className={styles.editorGroup}>
        <CapabilityForm
          selectedVersionId={selectedVersionId}
          versions={versions}
        />
        {detail && selectedVersionId && (
          <section className={styles.editorSection}>
            <h3 className={styles.editorSectionTitle}>Current capabilities</h3>
            <CapabilityEditor
              versionId={selectedVersionId}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              capabilities={(detail.capabilities ?? []) as any[]}
            />
          </section>
        )}
      </div>

      {/* 3: Ability */}
      <div className={styles.editorGroup}>
        <AbilityForm
          selectedVersionId={selectedVersionId}
          versions={versions}
        />
        {detail && selectedVersionId && (
          <section className={styles.editorSection}>
            <h3 className={styles.editorSectionTitle}>Current abilities</h3>
            <AbilityEditor
              versionId={selectedVersionId}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              abilities={(detail.abilities ?? []) as any[]}
            />
          </section>
        )}
      </div>

      {/* 4: Weakness */}
      <div className={styles.editorGroup}>
        <WeaknessForm
          selectedVersionId={selectedVersionId}
          versions={versions}
        />
        {detail && selectedVersionId && (
          <section className={styles.editorSection}>
            <h3 className={styles.editorSectionTitle}>Current weaknesses</h3>
            <WeaknessEditor
              versionId={selectedVersionId}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              weaknesses={(detail.weaknesses ?? []) as any[]}
            />
          </section>
        )}
      </div>

      {/* 5: Condition */}
      <div className={styles.editorGroup}>
        <ConditionForm
          selectedVersionId={selectedVersionId}
          versions={versions}
        />
        {detail && selectedVersionId && (
          <section className={styles.editorSection}>
            <h3 className={styles.editorSectionTitle}>Current conditions</h3>
            <ConditionEditor
              versionId={selectedVersionId}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              conditions={(detail.conditions ?? []) as any[]}
            />
          </section>
        )}
      </div>

      {/* 6: Equipment */}
      <div className={styles.editorGroup}>
        <EquipmentForm
          selectedVersionId={selectedVersionId}
          versions={versions}
        />
        {detail && selectedVersionId && (
          <section className={styles.editorSection}>
            <h3 className={styles.editorSectionTitle}>Current equipment</h3>
            <EquipmentEditor
              versionId={selectedVersionId}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              equipment={(detail.equipment ?? []) as any[]}
            />
          </section>
        )}
      </div>

      {/* 7: Feat */}
      <>
        {detail && selectedVersionId ? (
          <section className={styles.editorSection}>
            <h3 className={styles.editorSectionTitle}>Feats</h3>
            <FeatEditor
              versionId={selectedVersionId}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              feats={(detail.feats ?? []) as any[]}
            />
          </section>
        ) : (
          <p className={styles.editableListEmpty}>
            Select a version to manage feats.
          </p>
        )}
      </>
    </FormWorkflowShell>
  );
}

function toPortraitVersion(version: VersionOption): PortraitVersionOption {
  const portrait = portraitMetadata(version.metadata);

  return {
    currentPortraitDataUrl: portrait.dataUrl,
    currentPortraitSourceName: portrait.sourceName,
    id: version.id,
    label: version.label,
    originName: version.subject.originName ?? undefined,
    subjectName: version.subject.displayName,
  };
}

function portraitMetadata(metadata: unknown) {
  if (!isRecord(metadata) || !isRecord(metadata.portrait)) return {};

  return {
    dataUrl:
      typeof metadata.portrait.dataUrl === "string"
        ? metadata.portrait.dataUrl
        : undefined,
    sourceName:
      typeof metadata.portrait.sourceName === "string"
        ? metadata.portrait.sourceName
        : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
