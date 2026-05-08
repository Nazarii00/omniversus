"use server";

import { revalidatePath } from "next/cache";

import {
  AbilityType,
  CanonScope,
  CapabilityCategory,
  ConditionKind,
  ConditionType,
  ConfidenceBand,
  EquipmentCategory,
  OriginMedium,
  ProvenanceKind,
  ReviewStatus,
  SubjectKind,
  type AbilityType as AbilityTypeValue,
  type CanonScope as CanonScopeValue,
  type CapabilityCategory as CapabilityCategoryValue,
  type ConditionKind as ConditionKindValue,
  type ConditionType as ConditionTypeValue,
  type ConfidenceBand as ConfidenceBandValue,
  type EquipmentCategory as EquipmentCategoryValue,
  type OriginMedium as OriginMediumValue,
  type ReviewStatus as ReviewStatusValue,
  type SubjectKind as SubjectKindValue,
} from "@/generated/prisma/enums";

import { createEvidenceLink } from "./evidence";
import {
  assertAdminEnabled,
  normalizeAlias,
  optionalString,
  prismaOrThrow,
  readAliases,
  readBoolean,
  readEnum,
  readScore,
  requiredString,
  slugify,
} from "./formUtils";

export async function saveSubjectVersionAction(formData: FormData) {
  assertAdminEnabled();
  const prisma = prismaOrThrow();

  const displayName = requiredString(formData, "displayName", "Display name");
  const subjectSlug =
    optionalString(formData, "subjectSlug") ?? slugify(displayName);
  const versionLabel = requiredString(formData, "versionLabel", "Version label");
  const versionSlug =
    optionalString(formData, "versionSlug") ?? slugify(versionLabel);
  const isDefault = readBoolean(formData, "isDefault");

  const kind = readEnum(SubjectKind, formData, "kind", SubjectKind.OTHER);
  const originMedium = readEnum(
    OriginMedium,
    formData,
    "originMedium",
    OriginMedium.UNKNOWN,
  );
  const canonScope = readEnum(
    CanonScope,
    formData,
    "canonScope",
    CanonScope.PRIMARY_CANON,
  );

  await prisma.$transaction(async (tx) => {
    const subject = await tx.subject.upsert({
      where: { slug: subjectSlug },
      update: {
        displayName,
        canonicalName:
          optionalString(formData, "canonicalName") ?? displayName,
        kind: kind as SubjectKindValue,
        originMedium: originMedium as OriginMediumValue,
        originName: optionalString(formData, "originName"),
        summary: optionalString(formData, "subjectSummary"),
        metadata: { updatedFrom: "admin-panel" },
      },
      create: {
        slug: subjectSlug,
        displayName,
        canonicalName:
          optionalString(formData, "canonicalName") ?? displayName,
        kind: kind as SubjectKindValue,
        originMedium: originMedium as OriginMediumValue,
        originName: optionalString(formData, "originName"),
        summary: optionalString(formData, "subjectSummary"),
        metadata: { createdFrom: "admin-panel" },
      },
    });

    if (isDefault) {
      await tx.subjectVersion.updateMany({
        where: { subjectId: subject.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    await tx.subjectVersion.upsert({
      where: {
        subjectId_slug: {
          subjectId: subject.id,
          slug: versionSlug,
        },
      },
      update: {
        label: versionLabel,
        canonScope: canonScope as CanonScopeValue,
        continuity: optionalString(formData, "continuity"),
        era: optionalString(formData, "era"),
        form: optionalString(formData, "form"),
        state: optionalString(formData, "state"),
        isDefault,
        summary: optionalString(formData, "versionSummary"),
        confidenceScore: readScore(formData, "confidenceScore", 50),
        confidenceBand: readEnum(
          ConfidenceBand,
          formData,
          "confidenceBand",
          ConfidenceBand.MEDIUM,
        ) as ConfidenceBandValue,
        status: readEnum(
          ReviewStatus,
          formData,
          "status",
          ReviewStatus.REQUIRES_REVIEW,
        ) as ReviewStatusValue,
        provenance: ProvenanceKind.MANUAL_DB,
        metadata: { updatedFrom: "admin-panel" },
      },
      create: {
        subjectId: subject.id,
        slug: versionSlug,
        label: versionLabel,
        canonScope: canonScope as CanonScopeValue,
        continuity: optionalString(formData, "continuity"),
        era: optionalString(formData, "era"),
        form: optionalString(formData, "form"),
        state: optionalString(formData, "state"),
        isDefault,
        summary: optionalString(formData, "versionSummary"),
        confidenceScore: readScore(formData, "confidenceScore", 50),
        confidenceBand: readEnum(
          ConfidenceBand,
          formData,
          "confidenceBand",
          ConfidenceBand.MEDIUM,
        ) as ConfidenceBandValue,
        status: readEnum(
          ReviewStatus,
          formData,
          "status",
          ReviewStatus.REQUIRES_REVIEW,
        ) as ReviewStatusValue,
        provenance: ProvenanceKind.MANUAL_DB,
        metadata: { createdFrom: "admin-panel" },
      },
    });

    for (const alias of readAliases(formData, displayName)) {
      const normalizedValue = normalizeAlias(alias);
      if (!normalizedValue) continue;

      await tx.subjectAlias.upsert({
        where: {
          subjectId_normalizedValue: {
            subjectId: subject.id,
            normalizedValue,
          },
        },
        update: {
          value: alias,
        },
        create: {
          subjectId: subject.id,
          value: alias,
          normalizedValue,
        },
      });
    }
  });

  revalidatePath("/admin");
}

export async function addCapabilityAction(formData: FormData) {
  assertAdminEnabled();
  const prisma = prismaOrThrow();
  const category = readEnum(
    CapabilityCategory,
    formData,
    "category",
    CapabilityCategory.OTHER,
  );

  const fact = await prisma.capabilityAssertion.create({
    data: {
      versionId: requiredString(formData, "versionId", "Version"),
      category: category as CapabilityCategoryValue,
      subtype: optionalString(formData, "subtype"),
      valueText: requiredString(formData, "valueText", "Value text"),
      normalizedTier: optionalString(formData, "normalizedTier"),
      context: optionalString(formData, "context"),
      limitations: optionalString(formData, "limitations"),
      confidenceScore: readScore(formData, "confidenceScore", 50),
      confidenceBand: readEnum(
        ConfidenceBand,
        formData,
        "confidenceBand",
        ConfidenceBand.MEDIUM,
      ) as ConfidenceBandValue,
      status: readEnum(
        ReviewStatus,
        formData,
        "status",
        ReviewStatus.REQUIRES_REVIEW,
      ) as ReviewStatusValue,
      provenance: ProvenanceKind.MANUAL_DB,
      contested: readBoolean(formData, "contested"),
      notes: optionalString(formData, "notes"),
      metadata: { createdFrom: "admin-panel" },
    },
  });

  await createEvidenceLink(prisma, formData, { capabilityId: fact.id });
  revalidatePath("/admin");
}

export async function addAbilityAction(formData: FormData) {
  assertAdminEnabled();
  const prisma = prismaOrThrow();
  const type = readEnum(AbilityType, formData, "type", AbilityType.OTHER);

  const ability = await prisma.ability.create({
    data: {
      versionId: requiredString(formData, "versionId", "Version"),
      name: requiredString(formData, "name", "Ability name"),
      type: type as AbilityTypeValue,
      description: requiredString(formData, "description", "Description"),
      activation: optionalString(formData, "activation"),
      delivery: optionalString(formData, "delivery"),
      rangeText: optionalString(formData, "rangeText"),
      timing: optionalString(formData, "timing"),
      targetRequirement: optionalString(formData, "targetRequirement"),
      effect: optionalString(formData, "effect"),
      limitations: optionalString(formData, "limitations"),
      counterplay: optionalString(formData, "counterplay"),
      isPassive: readBoolean(formData, "isPassive"),
      confidenceScore: readScore(formData, "confidenceScore", 50),
      confidenceBand: readEnum(
        ConfidenceBand,
        formData,
        "confidenceBand",
        ConfidenceBand.MEDIUM,
      ) as ConfidenceBandValue,
      status: readEnum(
        ReviewStatus,
        formData,
        "status",
        ReviewStatus.REQUIRES_REVIEW,
      ) as ReviewStatusValue,
      provenance: ProvenanceKind.MANUAL_DB,
      metadata: { createdFrom: "admin-panel" },
    },
  });

  await createEvidenceLink(prisma, formData, { abilityId: ability.id });
  revalidatePath("/admin");
}

export async function addWeaknessAction(formData: FormData) {
  assertAdminEnabled();
  const prisma = prismaOrThrow();

  const weakness = await prisma.weakness.create({
    data: {
      versionId: requiredString(formData, "versionId", "Version"),
      name: requiredString(formData, "name", "Weakness name"),
      description: requiredString(formData, "description", "Description"),
      exploitation: optionalString(formData, "exploitation"),
      severity: readEnum(
        ConfidenceBand,
        formData,
        "severity",
        ConfidenceBand.MEDIUM,
      ) as ConfidenceBandValue,
      confidenceScore: readScore(formData, "confidenceScore", 50),
      confidenceBand: readEnum(
        ConfidenceBand,
        formData,
        "confidenceBand",
        ConfidenceBand.MEDIUM,
      ) as ConfidenceBandValue,
      status: readEnum(
        ReviewStatus,
        formData,
        "status",
        ReviewStatus.REQUIRES_REVIEW,
      ) as ReviewStatusValue,
      provenance: ProvenanceKind.MANUAL_DB,
      metadata: { createdFrom: "admin-panel" },
    },
  });

  await createEvidenceLink(prisma, formData, { weaknessId: weakness.id });
  revalidatePath("/admin");
}

export async function addConditionAction(formData: FormData) {
  assertAdminEnabled();
  const prisma = prismaOrThrow();

  const condition = await prisma.winLossCondition.create({
    data: {
      versionId: requiredString(formData, "versionId", "Version"),
      kind: readEnum(
        ConditionKind,
        formData,
        "kind",
        ConditionKind.WIN,
      ) as ConditionKindValue,
      type: readEnum(
        ConditionType,
        formData,
        "type",
        ConditionType.OTHER,
      ) as ConditionTypeValue,
      method: requiredString(formData, "method", "Method"),
      requires: optionalString(formData, "requires"),
      blockedBy: optionalString(formData, "blockedBy"),
      probabilityText: optionalString(formData, "probabilityText"),
      confidenceScore: readScore(formData, "confidenceScore", 50),
      confidenceBand: readEnum(
        ConfidenceBand,
        formData,
        "confidenceBand",
        ConfidenceBand.MEDIUM,
      ) as ConfidenceBandValue,
      status: readEnum(
        ReviewStatus,
        formData,
        "status",
        ReviewStatus.REQUIRES_REVIEW,
      ) as ReviewStatusValue,
      provenance: ProvenanceKind.MANUAL_DB,
      metadata: { createdFrom: "admin-panel" },
    },
  });

  await createEvidenceLink(prisma, formData, { conditionId: condition.id });
  revalidatePath("/admin");
}

export async function addEquipmentAction(formData: FormData) {
  assertAdminEnabled();
  const prisma = prismaOrThrow();

  const item = await prisma.equipmentItem.create({
    data: {
      versionId: requiredString(formData, "versionId", "Version"),
      name: requiredString(formData, "name", "Equipment name"),
      category: readEnum(
        EquipmentCategory,
        formData,
        "category",
        EquipmentCategory.OTHER,
      ) as EquipmentCategoryValue,
      description: requiredString(formData, "description", "Description"),
      standard: readBoolean(formData, "standard"),
      availabilityPolicy: optionalString(formData, "availabilityPolicy"),
      limitations: optionalString(formData, "limitations"),
      status: readEnum(
        ReviewStatus,
        formData,
        "status",
        ReviewStatus.REQUIRES_REVIEW,
      ) as ReviewStatusValue,
      provenance: ProvenanceKind.MANUAL_DB,
      metadata: { createdFrom: "admin-panel" },
    },
  });

  await createEvidenceLink(prisma, formData, { equipmentId: item.id });
  revalidatePath("/admin");
}
