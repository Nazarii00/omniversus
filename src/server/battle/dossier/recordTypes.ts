export type EvidenceSourceForFact = {
  title: string;
  url: string | null;
  citation: string | null;
};

export type EvidenceChunkForFact = {
  externalId: string | null;
  source: EvidenceSourceForFact | null;
};

export type EvidenceLinkForFact = {
  source: EvidenceSourceForFact | null;
  chunk: EvidenceChunkForFact | null;
  quote: string | null;
  note: string | null;
  relevanceScore: number;
};

export type FactRecordBase = {
  id: string;
  status: string;
  provenance: string;
  confidenceScore?: number | null;
  notes?: string | null;
  evidenceLinks?: EvidenceLinkForFact[];
};

export type SubjectLookupRecord = {
  id: string;
  slug: string;
  displayName: string;
  canonicalName: string;
  kind: string;
};

export type SubjectVersionSubjectRecord = SubjectLookupRecord & {
  aliases: { value: string }[];
};

export type CapabilityRecord = FactRecordBase & {
  category: string;
  subtype: string | null;
  valueText: string;
  normalizedTier: string | null;
  unit: string | null;
  context: string | null;
  limitations: string | null;
  contested: boolean;
};

export type AbilityRecord = FactRecordBase & {
  name: string;
  type: string;
  description: string;
  activation: string | null;
  delivery: string | null;
  rangeText: string | null;
  timing: string | null;
  targetRequirement: string | null;
  effect: string | null;
  limitations: string | null;
  counterplay: string | null;
  isPassive: boolean;
};

export type ResistanceRecord = FactRecordBase & {
  type: string;
  name: string;
  basis: string;
  limits: string | null;
};

export type EquipmentRecord = FactRecordBase & {
  name: string;
  category: string;
  description: string;
  standard: boolean;
  availabilityPolicy: string | null;
  limitations: string | null;
};

export type WeaknessRecord = FactRecordBase & {
  name: string;
  description: string;
  exploitation: string | null;
  severity: string;
};

export type ConditionRecord = FactRecordBase & {
  kind: string;
  type: string;
  method: string;
  requires: string | null;
  blockedBy: string | null;
  probabilityText: string | null;
};

export type FeatRecord = FactRecordBase & {
  kind: string;
  category: string | null;
  title: string;
  description: string;
  scaleText: string | null;
  context: string | null;
  limitations: string | null;
};

export type ScalingVersionRecord = {
  label: string;
  subject: {
    displayName: string;
  };
};

export type ScalingRecord = FactRecordBase & {
  relation: string;
  category: string | null;
  rationale: string;
  limitations: string | null;
  fromVersion?: ScalingVersionRecord;
  toVersion?: ScalingVersionRecord;
};

export type VersionDossierRecord = FactRecordBase & {
  label: string;
  slug: string;
  canonScope: string;
  continuity: string | null;
  era: string | null;
  form: string | null;
  state: string | null;
  isDefault: boolean;
  metadata: unknown;
  summary: string | null;
  subject: SubjectVersionSubjectRecord;
  capabilities: CapabilityRecord[];
  abilities: AbilityRecord[];
  resistances: ResistanceRecord[];
  equipment: EquipmentRecord[];
  weaknesses: WeaknessRecord[];
  conditions: ConditionRecord[];
  feats: FeatRecord[];
  scalingFrom: ScalingRecord[];
  scalingTo: ScalingRecord[];
};

export type DossierSide = "A" | "B";
