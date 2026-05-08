import { CAPABILITY_CATEGORY_MAP } from "./constants";
import type {
  AbilityRecord,
  CapabilityRecord,
  ConditionRecord,
  EquipmentRecord,
  EvidenceLinkForFact,
  FactRecordBase,
  FeatRecord,
  ResistanceRecord,
  ScalingRecord,
  VersionDossierRecord,
  WeaknessRecord,
} from "./recordTypes";
import {
  clampConfidence,
  compactText,
  isPresent,
  joinText,
  labelize,
  normalizeLookup,
} from "./text";
import type {
  DossierFact,
  DossierFactCategory,
  DossierFactSourceType,
  DossierFactStatus,
  FighterDossier,
} from "./types";

function mapReviewStatus(status: string): DossierFactStatus | null {
  switch (status) {
    case "VERIFIED":
      return "VERIFIED";
    case "ACCEPTED":
      return "ACCEPTED";
    case "REQUIRES_REVIEW":
      return "REQUIRES_VERIFICATION";
    case "CONTESTED":
      return "CONTESTED";
    case "MODEL_INFERRED":
      return "MODEL_INFERRED";
    case "REJECTED":
      return null;
    default:
      return "REQUIRES_VERIFICATION";
  }
}

function mapFactSourceType(record: FactRecordBase): DossierFactSourceType {
  if (record.provenance === "MANUAL_DB") return "MANUAL_DB";
  if (record.provenance === "MODEL_INFERRED") return "MODEL_INFERRED";
  if (record.provenance === "RAG_RETRIEVED") return "RAG_RETRIEVED";
  if (record.provenance === "IMPORTED_SOURCE") return "RAG_RETRIEVED";
  if (record.status === "VERIFIED" || record.status === "ACCEPTED") {
    return "ACCEPTED_DB";
  }
  return "LOCAL_SEED";
}

export function mapVersionProvenance(
  provenance: string,
): FighterDossier["provenance"] {
  switch (provenance) {
    case "MANUAL_DB":
      return "MANUAL";
    case "RAG_RETRIEVED":
    case "IMPORTED_SOURCE":
      return "MIXED";
    case "MODEL_INFERRED":
      return "MODEL_INFERRED";
    case "MIXED":
      return "MIXED";
    default:
      return "UNKNOWN";
  }
}

function bestEvidenceLink(
  evidenceLinks: EvidenceLinkForFact[] | undefined,
): EvidenceLinkForFact | null {
  if (!evidenceLinks?.length) return null;

  return [...evidenceLinks].sort(
    (left, right) => right.relevanceScore - left.relevanceScore,
  )[0];
}

function sourceRef(record: FactRecordBase): string {
  const link = bestEvidenceLink(record.evidenceLinks);
  const source = link?.source ?? link?.chunk?.source ?? null;

  if (source?.citation) return source.citation;
  if (source?.url) return `${source.title}: ${source.url}`;
  if (source?.title) return source.title;
  if (link?.note) return link.note;
  if (link?.chunk?.externalId) return `Evidence chunk ${link.chunk.externalId}`;
  return "Curated database record; source requires verification";
}

function makeFact(
  record: FactRecordBase,
  category: DossierFactCategory,
  text: string,
  notes?: string | null,
): DossierFact | null {
  const status = mapReviewStatus(record.status);
  const cleanText = compactText(text);

  if (!status || !cleanText) return null;

  return {
    id: record.id,
    category,
    text: cleanText,
    source_ref: sourceRef(record),
    source_type: mapFactSourceType(record),
    status,
    confidence: clampConfidence(record.confidenceScore),
    notes: notes ?? record.notes ?? undefined,
  };
}

function capabilityToFact(record: CapabilityRecord): DossierFact | null {
  const category = CAPABILITY_CATEGORY_MAP[record.category] ?? "OTHER";
  const text = joinText([
    `${labelize(record.category)}${record.subtype ? ` (${record.subtype})` : ""}: ${record.valueText}.`,
    record.normalizedTier ? `Normalized tier: ${record.normalizedTier}.` : null,
    record.unit ? `Unit: ${record.unit}.` : null,
    record.context ? `Context: ${record.context}.` : null,
    record.limitations ? `Limits: ${record.limitations}.` : null,
    record.contested ? "Contested assertion." : null,
  ]);

  return makeFact(record, category, text);
}

function abilityToFact(record: AbilityRecord): DossierFact | null {
  const text = joinText([
    `${record.isPassive ? "Passive ability" : "Ability"} - ${record.name} (${labelize(record.type)}): ${record.description}.`,
    record.activation ? `Activation: ${record.activation}.` : null,
    record.delivery ? `Delivery: ${record.delivery}.` : null,
    record.rangeText ? `Range: ${record.rangeText}.` : null,
    record.timing ? `Timing: ${record.timing}.` : null,
    record.targetRequirement
      ? `Target requirement: ${record.targetRequirement}.`
      : null,
    record.effect ? `Effect: ${record.effect}.` : null,
    record.limitations ? `Limits: ${record.limitations}.` : null,
    record.counterplay ? `Counterplay: ${record.counterplay}.` : null,
  ]);

  return makeFact(record, "ABILITY", text);
}

function resistanceToFact(record: ResistanceRecord): DossierFact | null {
  const text = joinText([
    `Resistance - ${record.name} (${labelize(record.type)}): ${record.basis}.`,
    record.limits ? `Limits: ${record.limits}.` : null,
  ]);

  return makeFact(record, "RESISTANCE", text);
}

function equipmentToFact(record: EquipmentRecord): DossierFact | null {
  const text = joinText([
    `${record.standard ? "Standard" : "Optional"} equipment - ${record.name} (${labelize(record.category)}): ${record.description}.`,
    record.availabilityPolicy
      ? `Availability: ${record.availabilityPolicy}.`
      : null,
    record.limitations ? `Limits: ${record.limitations}.` : null,
  ]);

  return makeFact(record, "EQUIPMENT", text);
}

function weaknessToFact(record: WeaknessRecord): DossierFact | null {
  const text = joinText([
    `Weakness - ${record.name}: ${record.description}.`,
    record.exploitation ? `Exploitation: ${record.exploitation}.` : null,
    `Severity: ${labelize(record.severity)}.`,
  ]);

  return makeFact(record, "WEAKNESS", text);
}

function conditionToFact(record: ConditionRecord): DossierFact | null {
  const category: DossierFactCategory =
    record.kind === "LOSS" ? "LOSS_CONDITION" : "WIN_CONDITION";
  const text = joinText([
    `${labelize(record.kind)} condition (${labelize(record.type)}): ${record.method}.`,
    record.requires ? `Requires: ${record.requires}.` : null,
    record.blockedBy ? `Blocked by: ${record.blockedBy}.` : null,
    record.probabilityText ? `Probability note: ${record.probabilityText}.` : null,
  ]);

  return makeFact(record, category, text);
}

function featToFact(record: FeatRecord): DossierFact | null {
  const category: DossierFactCategory =
    record.kind === "ANTI_FEAT"
      ? "ANTI_FEAT"
      : record.kind === "SCALING"
        ? "SCALING"
        : "FEAT";
  const capabilityCategory = record.category
    ? ` (${labelize(record.category)})`
    : "";
  const text = joinText([
    `${labelize(record.kind)}${capabilityCategory} - ${record.title}: ${record.description}.`,
    record.scaleText ? `Scale: ${record.scaleText}.` : null,
    record.context ? `Context: ${record.context}.` : null,
    record.limitations ? `Limits: ${record.limitations}.` : null,
  ]);

  return makeFact(record, category, text);
}

function scalingFromToFact(record: ScalingRecord): DossierFact | null {
  const target = record.toVersion
    ? `${record.toVersion.subject.displayName} (${record.toVersion.label})`
    : "target version";
  const category = record.category ? ` ${labelize(record.category)}` : "";
  const text = joinText([
    `Scaling${category}: ${labelize(record.relation)} ${target}. ${record.rationale}.`,
    record.limitations ? `Limits: ${record.limitations}.` : null,
  ]);

  return makeFact(record, "SCALING", text);
}

function scalingToFact(record: ScalingRecord): DossierFact | null {
  const source = record.fromVersion
    ? `${record.fromVersion.subject.displayName} (${record.fromVersion.label})`
    : "source version";
  const category = record.category ? ` ${labelize(record.category)}` : "";
  const text = joinText([
    `Reverse scaling${category}: ${source} ${labelize(record.relation)} this version. ${record.rationale}.`,
    record.limitations ? `Limits: ${record.limitations}.` : null,
  ]);

  return makeFact(record, "SCALING", text);
}

function versionToFact(version: VersionDossierRecord): DossierFact | null {
  const descriptors = [
    version.continuity,
    version.era,
    version.form,
    version.state,
  ].filter(Boolean);
  const text = joinText([
    `Resolved version: ${version.label}.`,
    `Canon scope: ${version.canonScope}.`,
    descriptors.length ? `Descriptors: ${descriptors.join(", ")}.` : null,
    version.summary ? `Summary: ${version.summary}.` : null,
  ]);

  return makeFact(
    version,
    "VERSION",
    text,
    version.isDefault ? "Default version for this subject." : null,
  );
}

export function factsFromVersion(version: VersionDossierRecord): DossierFact[] {
  return [
    versionToFact(version),
    ...version.capabilities.map(capabilityToFact),
    ...version.abilities.map(abilityToFact),
    ...version.resistances.map(resistanceToFact),
    ...version.equipment.map(equipmentToFact),
    ...version.weaknesses.map(weaknessToFact),
    ...version.conditions.map(conditionToFact),
    ...version.feats.map(featToFact),
    ...version.scalingFrom.map(scalingFromToFact),
    ...version.scalingTo.map(scalingToFact),
  ].filter(isPresent);
}

export function dedupeFacts(facts: DossierFact[]): DossierFact[] {
  const seen = new Set<string>();
  const unique: DossierFact[] = [];

  for (const fact of facts) {
    const key = `${fact.category}:${normalizeLookup(fact.text)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(fact);
  }

  return unique;
}
