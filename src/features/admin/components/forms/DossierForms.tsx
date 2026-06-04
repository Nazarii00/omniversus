import type { VersionOption } from "../../data/loadAdminData";
import { AbilityForm } from "./AbilityForm";
import { CapabilityForm } from "./CapabilityForm";
import { ConditionForm } from "./ConditionForm";
import { EquipmentForm } from "./EquipmentForm";
import {
  FormWorkflowShell,
  type FormWorkflowStep,
} from "./FormWorkflowShell";
import {
  SubjectPortraitStudio,
  type PortraitVersionOption,
} from "./SubjectPortraitStudio";
import { SubjectVersionForm } from "./SubjectVersionForm";
import { WeaknessForm } from "./WeaknessForm";

const PROFILE_STEPS: FormWorkflowStep[] = [
  {
    description: "Create the subject and the playable/versioned profile.",
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
    description: "File the core AP, speed, durability, range, and stamina facts.",
    id: "capability",
    optional: true,
    title: "Capabilities",
  },
  {
    description: "File abilities, activation conditions, delivery, and counterplay.",
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
    title: "Win/Loss",
  },
  {
    description: "File standard equipment and availability rules.",
    id: "equipment",
    optional: true,
    title: "Equipment",
  },
];

export function DossierForms({
  isAddingSubject = false,
  selectedVersion,
  versions,
}: {
  isAddingSubject?: boolean;
  selectedVersion?: VersionOption | null;
  versions: VersionOption[];
}) {
  const portraitVersions = versions.map(toPortraitVersion);
  const selectedVersionId = selectedVersion?.id;

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
      <SubjectVersionForm selectedVersion={selectedVersion} />
      <SubjectPortraitStudio
        selectedVersionId={selectedVersionId}
        versions={portraitVersions}
      />
      <CapabilityForm
        selectedVersionId={selectedVersionId}
        versions={versions}
      />
      <AbilityForm selectedVersionId={selectedVersionId} versions={versions} />
      <WeaknessForm
        selectedVersionId={selectedVersionId}
        versions={versions}
      />
      <ConditionForm
        selectedVersionId={selectedVersionId}
        versions={versions}
      />
      <EquipmentForm
        selectedVersionId={selectedVersionId}
        versions={versions}
      />
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
