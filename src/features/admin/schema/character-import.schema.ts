import { z } from "zod";

import {
  AbilityType,
  CanonScope,
  CapabilityCategory,
  ConditionKind,
  ConditionType,
  ConfidenceBand,
  EquipmentCategory,
  FeatKind,
  OriginMedium,
  ProvenanceKind,
  ReviewStatus,
  SubjectKind,
} from "@/generated/prisma/enums";

// ─── Enums as Zod schemas ───────────────────────────────────────────

const subjectKindSchema = z.nativeEnum(SubjectKind);
const originMediumSchema = z.nativeEnum(OriginMedium);
const canonScopeSchema = z.nativeEnum(CanonScope);
const confidenceBandSchema = z.nativeEnum(ConfidenceBand);
const reviewStatusSchema = z.nativeEnum(ReviewStatus);
const provenanceKindSchema = z.nativeEnum(ProvenanceKind);
const capabilityCategorySchema = z.nativeEnum(CapabilityCategory);
const abilityTypeSchema = z.nativeEnum(AbilityType);
const equipmentCategorySchema = z.nativeEnum(EquipmentCategory);
const conditionKindSchema = z.nativeEnum(ConditionKind);
const conditionTypeSchema = z.nativeEnum(ConditionType);
const featKindSchema = z.nativeEnum(FeatKind);

// ─── Reusable partials ──────────────────────────────────────────────

const metadataSchema = z.record(z.string(), z.unknown()).nullable().optional();

const confidenceFields = {
  confidenceBand: confidenceBandSchema.nullable().optional(),
  confidenceScore: z.number().int().min(0).max(100).nullable().optional(),
};

const reviewFields = {
  status: reviewStatusSchema.nullable().optional(),
  provenance: provenanceKindSchema.nullable().optional(),
  metadata: metadataSchema,
};

// ─── Subject ────────────────────────────────────────────────────────

const subjectSchema = z.object({
  slug: z.string().min(1),
  displayName: z.string().min(1),
  canonicalName: z.string().min(1),
  kind: subjectKindSchema,
  originMedium: originMediumSchema,
  originName: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  metadata: metadataSchema,
});

// ─── Version ────────────────────────────────────────────────────────

const versionSchema = z.object({
  slug: z.string().min(1),
  label: z.string().min(1),
  canonScope: canonScopeSchema,
  continuity: z.string().nullable().optional(),
  era: z.string().nullable().optional(),
  form: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  isDefault: z.boolean().nullable().optional(),
  summary: z.string().nullable().optional(),
  ...confidenceFields,
  ...reviewFields,
});

// ─── Capability ─────────────────────────────────────────────────────

const capabilitySchema = z.object({
  category: capabilityCategorySchema,
  subtype: z.string().nullable().optional(),
  valueText: z.string().min(1),
  normalizedTier: z.string().nullable().optional(),
  normalizedValue: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  context: z.string().nullable().optional(),
  limitations: z.string().nullable().optional(),
  contested: z.boolean().nullable().optional(),
  notes: z.string().nullable().optional(),
  ...confidenceFields,
  ...reviewFields,
});

// ─── Ability ────────────────────────────────────────────────────────

const abilitySchema = z.object({
  name: z.string().min(1),
  type: abilityTypeSchema,
  description: z.string().min(1),
  activation: z.string().nullable().optional(),
  delivery: z.string().nullable().optional(),
  rangeText: z.string().nullable().optional(),
  timing: z.string().nullable().optional(),
  targetRequirement: z.string().nullable().optional(),
  effect: z.string().nullable().optional(),
  limitations: z.string().nullable().optional(),
  counterplay: z.string().nullable().optional(),
  isPassive: z.boolean().nullable().optional(),
  ...confidenceFields,
  ...reviewFields,
});

// ─── Resistance ─────────────────────────────────────────────────────

const resistanceSchema = z.object({
  type: abilityTypeSchema,
  name: z.string().min(1),
  basis: z.string().min(1),
  limits: z.string().nullable().optional(),
  ...confidenceFields,
  ...reviewFields,
});

// ─── Weakness ───────────────────────────────────────────────────────

const weaknessSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  exploitation: z.string().nullable().optional(),
  severity: confidenceBandSchema.nullable().optional(),
  ...confidenceFields,
  ...reviewFields,
});

// ─── Condition ──────────────────────────────────────────────────────

const conditionSchema = z.object({
  kind: conditionKindSchema,
  type: conditionTypeSchema,
  method: z.string().min(1),
  requires: z.string().nullable().optional(),
  blockedBy: z.string().nullable().optional(),
  probabilityText: z.string().nullable().optional(),
  ...confidenceFields,
  ...reviewFields,
});

// ─── Equipment ──────────────────────────────────────────────────────

const equipmentSchema = z.object({
  name: z.string().min(1),
  category: equipmentCategorySchema,
  description: z.string().min(1),
  standard: z.boolean().nullable().optional(),
  availabilityPolicy: z.string().nullable().optional(),
  limitations: z.string().nullable().optional(),
  ...reviewFields,
});

// ─── Feat ───────────────────────────────────────────────────────────

const featSchema = z.object({
  kind: featKindSchema,
  category: capabilityCategorySchema.nullable().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  scaleText: z.string().nullable().optional(),
  context: z.string().nullable().optional(),
  limitations: z.string().nullable().optional(),
  ...confidenceFields,
  ...reviewFields,
});

// ─── Full Character Import ──────────────────────────────────────────

export const CharacterImportSchema = z.object({
  subject: subjectSchema,
  aliases: z.array(z.string()).nullable().optional(),
  version: versionSchema,
  capabilities: z.array(capabilitySchema).nullable().optional(),
  abilities: z.array(abilitySchema).nullable().optional(),
  resistances: z.array(resistanceSchema).nullable().optional(),
  weaknesses: z.array(weaknessSchema).nullable().optional(),
  conditions: z.array(conditionSchema).nullable().optional(),
  equipment: z.array(equipmentSchema).nullable().optional(),
  feats: z.array(featSchema).nullable().optional(),
});

export const CharacterImportBatchSchema = z.array(CharacterImportSchema);

// ─── Inferred types ─────────────────────────────────────────────────

export type CharacterImport = z.infer<typeof CharacterImportSchema>;
export type CharacterImportBatch = z.infer<typeof CharacterImportBatchSchema>;
export type ImportSubject = z.infer<typeof subjectSchema>;
export type ImportVersion = z.infer<typeof versionSchema>;
export type ImportCapability = z.infer<typeof capabilitySchema>;
export type ImportAbility = z.infer<typeof abilitySchema>;
export type ImportResistance = z.infer<typeof resistanceSchema>;
export type ImportWeakness = z.infer<typeof weaknessSchema>;
export type ImportCondition = z.infer<typeof conditionSchema>;
export type ImportEquipment = z.infer<typeof equipmentSchema>;
export type ImportFeat = z.infer<typeof featSchema>;
