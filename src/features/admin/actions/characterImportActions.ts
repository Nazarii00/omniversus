"use server";

import { revalidatePath } from "next/cache";

import { assertAdminEnabled, prismaOrThrow, requiredString } from "./formUtils";
import { CharacterImportBatchSchema } from "../schema/character-import.schema";
import { importCharacterBatch } from "../logic/characterImportCore";
import {
  ReviewStatus,
  ProvenanceKind,
  ConfidenceBand,
  SubjectKind,
  OriginMedium,
  CanonScope,
  CapabilityCategory,
  AbilityType,
  ConditionKind,
  ConditionType,
  EquipmentCategory,
  FeatKind,
} from "@/generated/prisma/enums";
import { normalizeAlias } from "./formUtils";
import { Prisma } from "@/generated/prisma/client";

// ─── Types ──────────────────────────────────────────────────────────

type JsonRecord = Record<string, unknown>;

// ─── Batch import action ────────────────────────────────────────────

export async function importCharacterBatchAction(formData: FormData) {
  assertAdminEnabled();
  const prisma = prismaOrThrow();

  const rawJson = requiredString(formData, "json", "JSON data");
  const batchId = crypto.randomUUID();

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("Invalid JSON format");
  }

  const validated = CharacterImportBatchSchema.parse(parsed);

  const result = await importCharacterBatch(prisma, validated, batchId);

  revalidatePath("/admin");

  return result;
}

// ─── Approve import suggestion ──────────────────────────────────────

export async function approveCharacterImportAction(formData: FormData) {
  assertAdminEnabled();
  const prisma = prismaOrThrow();

  const suggestionId = requiredString(
    formData,
    "suggestionId",
    "Suggestion ID",
  );
  const resolutionNote =
    formData.get("resolutionNote")?.toString()?.trim() || null;
  const resolvedAt = new Date();

  await prisma.$transaction(async (tx) => {
    const suggestion = await tx.characterImportSuggestion.findUniqueOrThrow({
      where: { id: suggestionId },
    });

    if (suggestion.status !== ReviewStatus.REQUIRES_REVIEW) {
      throw new Error("This import suggestion has already been resolved");
    }

    const importPayload = suggestion.importPayload as JsonRecord;
    const subject = importPayload.subject as JsonRecord;
    const version = importPayload.version as JsonRecord;

    // Upsert subject
    const existingSubject = await tx.subject.findUnique({
      where: { slug: suggestion.subjectSlug },
    });

    if (!existingSubject) {
      throw new Error("Subject no longer exists");
    }

    await tx.subject.update({
      where: { id: existingSubject.id },
      data: {
        displayName: subject.displayName as string,
        canonicalName: subject.canonicalName as string,
        kind: subject.kind as SubjectKind,
        originMedium: subject.originMedium as OriginMedium,
        originName: subject.originName as string | null,
        summary: subject.summary as string | null,
        metadata: {
          ...((subject.metadata as JsonRecord) || {}),
          updatedViaImport: true,
        } as Prisma.InputJsonValue,
      },
    });

    // Upsert aliases
    const aliases = (importPayload.aliases as string[]) ?? [];
    const aliasValues = new Set([
      subject.displayName as string,
      subject.canonicalName as string,
      ...aliases,
    ]);

    for (const alias of aliasValues) {
      await tx.subjectAlias.upsert({
        where: {
          subjectId_normalizedValue: {
            subjectId: existingSubject.id,
            normalizedValue: normalizeAlias(alias),
          },
        },
        update: { value: alias },
        create: {
          subjectId: existingSubject.id,
          value: alias,
          normalizedValue: normalizeAlias(alias),
        },
      });
    }

    // Upsert version
    const versionWhere = {
      subjectId_slug: {
        subjectId: existingSubject.id,
        slug: suggestion.versionSlug ?? (version.slug as string),
      },
    };

    const existingVersion = await tx.subjectVersion.findUnique({
      where: versionWhere,
      select: { id: true },
    });

    let versionId: string;

    if (existingVersion) {
      await tx.subjectVersion.update({
        where: { id: existingVersion.id },
        data: {
          label: version.label as string,
          canonScope: version.canonScope as CanonScope,
          continuity: version.continuity as string | null,
          era: version.era as string | null,
          form: version.form as string | null,
          state: version.state as string | null,
          isDefault: (version.isDefault as boolean) ?? false,
          summary: version.summary as string | null,
          confidenceBand:
            (version.confidenceBand as ConfidenceBand) ?? ConfidenceBand.MEDIUM,
          confidenceScore:
            (version.confidenceScore as number | undefined) ?? 50,
          status:
            (version.status as ReviewStatus) ?? ReviewStatus.MODEL_INFERRED,
          provenance:
            (version.provenance as ProvenanceKind) ??
            ProvenanceKind.IMPORTED_SOURCE,
          metadata: {
            ...((version.metadata as JsonRecord) || {}),
            updatedViaImport: true,
          } as Prisma.InputJsonValue,
        },
      });
      versionId = existingVersion.id;
    } else {
      const newVersion = await tx.subjectVersion.create({
        data: {
          subjectId: existingSubject.id,
          slug: (version.slug as string) ?? "imported",
          label: version.label as string,
          canonScope: version.canonScope as CanonScope,
          continuity: version.continuity as string | null,
          era: version.era as string | null,
          form: version.form as string | null,
          state: version.state as string | null,
          isDefault: (version.isDefault as boolean) ?? false,
          summary: version.summary as string | null,
          confidenceBand:
            (version.confidenceBand as ConfidenceBand) ?? ConfidenceBand.MEDIUM,
          confidenceScore:
            (version.confidenceScore as number | undefined) ?? 50,
          status:
            (version.status as ReviewStatus) ?? ReviewStatus.MODEL_INFERRED,
          provenance:
            (version.provenance as ProvenanceKind) ??
            ProvenanceKind.IMPORTED_SOURCE,
          metadata: {
            ...((version.metadata as JsonRecord) || {}),
            importedViaImport: true,
          } as Prisma.InputJsonValue,
        },
      });
      versionId = newVersion.id;
    }

    // Delete existing sub-entities and recreate from payload
    await tx.capabilityAssertion.deleteMany({ where: { versionId } });
    await tx.ability.deleteMany({ where: { versionId } });
    await tx.resistance.deleteMany({ where: { versionId } });
    await tx.weakness.deleteMany({ where: { versionId } });
    await tx.winLossCondition.deleteMany({ where: { versionId } });
    await tx.equipmentItem.deleteMany({ where: { versionId } });
    await tx.featAssertion.deleteMany({ where: { versionId } });

    // Recreate from payload
    await createSubEntitiesFromPayload(tx, versionId, importPayload);

    // Mark suggestion as accepted
    await tx.characterImportSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: ReviewStatus.ACCEPTED,
        resolvedAt,
        resolutionNote,
        metadata: {
          ...((suggestion.metadata as JsonRecord) || {}),
          resolvedViaImport: true,
        } as Prisma.InputJsonValue,
      },
    });
  });

  revalidatePath("/admin");
}

// ─── Reject import suggestion ───────────────────────────────────────

export async function rejectCharacterImportAction(formData: FormData) {
  assertAdminEnabled();
  const prisma = prismaOrThrow();

  const suggestionId = requiredString(
    formData,
    "suggestionId",
    "Suggestion ID",
  );
  const resolutionNote =
    formData.get("resolutionNote")?.toString()?.trim() || null;
  const resolvedAt = new Date();

  await prisma.characterImportSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: ReviewStatus.REJECTED,
      resolvedAt,
      resolutionNote,
    },
  });

  revalidatePath("/admin");
}

// ─── Helper: create sub-entities from raw payload ───────────────────

type TransactionClient = Prisma.TransactionClient;

async function createSubEntitiesFromPayload(
  tx: TransactionClient,
  versionId: string,
  payload: JsonRecord,
) {
  const defaults = {
    status: ReviewStatus.MODEL_INFERRED,
    provenance: ProvenanceKind.IMPORTED_SOURCE,
  };

  const capabilities = payload.capabilities as JsonRecord[] | undefined;
  if (capabilities?.length) {
    await tx.capabilityAssertion.createMany({
      data: capabilities.map((c) => ({
        versionId,
        category: c.category as CapabilityCategory,
        subtype: c.subtype as string | undefined,
        valueText: c.valueText as string,
        normalizedTier: c.normalizedTier as string | undefined,
        normalizedValue: c.normalizedValue as number | undefined,
        unit: c.unit as string | undefined,
        context: c.context as string | undefined,
        limitations: c.limitations as string | undefined,
        contested: (c.contested as boolean) ?? false,
        notes: c.notes as string | undefined,
        confidenceBand:
          (c.confidenceBand as ConfidenceBand) ?? ConfidenceBand.MEDIUM,
        confidenceScore: (c.confidenceScore as number | undefined) ?? 50,
        ...defaults,
      })),
    });
  }

  const abilities = payload.abilities as JsonRecord[] | undefined;
  if (abilities?.length) {
    await tx.ability.createMany({
      data: abilities.map((a) => ({
        versionId,
        name: a.name as string,
        type: a.type as AbilityType,
        description: a.description as string,
        activation: a.activation as string | undefined,
        delivery: a.delivery as string | undefined,
        rangeText: a.rangeText as string | undefined,
        timing: a.timing as string | undefined,
        targetRequirement: a.targetRequirement as string | undefined,
        effect: a.effect as string | undefined,
        limitations: a.limitations as string | undefined,
        counterplay: a.counterplay as string | undefined,
        isPassive: (a.isPassive as boolean) ?? false,
        confidenceBand:
          (a.confidenceBand as ConfidenceBand) ?? ConfidenceBand.MEDIUM,
        confidenceScore: (a.confidenceScore as number | undefined) ?? 50,
        ...defaults,
      })),
    });
  }

  const resistances = payload.resistances as JsonRecord[] | undefined;
  if (resistances?.length) {
    await tx.resistance.createMany({
      data: resistances.map((r) => ({
        versionId,
        type: r.type as AbilityType,
        name: r.name as string,
        basis: r.basis as string,
        limits: r.limits as string | undefined,
        confidenceBand:
          (r.confidenceBand as ConfidenceBand) ?? ConfidenceBand.MEDIUM,
        confidenceScore: (r.confidenceScore as number | undefined) ?? 50,
        ...defaults,
      })),
    });
  }

  const weaknesses = payload.weaknesses as JsonRecord[] | undefined;
  if (weaknesses?.length) {
    await tx.weakness.createMany({
      data: weaknesses.map((w) => ({
        versionId,
        name: w.name as string,
        description: w.description as string,
        exploitation: w.exploitation as string | undefined,
        severity: (w.severity as ConfidenceBand) ?? ConfidenceBand.MEDIUM,
        confidenceBand:
          (w.confidenceBand as ConfidenceBand) ?? ConfidenceBand.MEDIUM,
        confidenceScore: (w.confidenceScore as number | undefined) ?? 50,
        ...defaults,
      })),
    });
  }

  const conditions = payload.conditions as JsonRecord[] | undefined;
  if (conditions?.length) {
    await tx.winLossCondition.createMany({
      data: conditions.map((c) => ({
        versionId,
        kind: c.kind as ConditionKind,
        type: c.type as ConditionType,
        method: c.method as string,
        requires: c.requires as string | undefined,
        blockedBy: c.blockedBy as string | undefined,
        probabilityText: c.probabilityText as string | undefined,
        confidenceBand:
          (c.confidenceBand as ConfidenceBand) ?? ConfidenceBand.MEDIUM,
        confidenceScore: (c.confidenceScore as number | undefined) ?? 50,
        ...defaults,
      })),
    });
  }

  const equipment = payload.equipment as JsonRecord[] | undefined;
  if (equipment?.length) {
    await tx.equipmentItem.createMany({
      data: equipment.map((e) => ({
        versionId,
        name: e.name as string,
        category: e.category as EquipmentCategory,
        description: e.description as string,
        standard: (e.standard as boolean) ?? true,
        availabilityPolicy: e.availabilityPolicy as string | undefined,
        limitations: e.limitations as string | undefined,
        ...defaults,
      })),
    });
  }

  const feats = payload.feats as JsonRecord[] | undefined;
  if (feats?.length) {
    await tx.featAssertion.createMany({
      data: feats.map((f) => ({
        versionId,
        kind: f.kind as FeatKind,
        category: f.category as CapabilityCategory | null | undefined,
        title: f.title as string,
        description: f.description as string,
        scaleText: f.scaleText as string | undefined,
        context: f.context as string | undefined,
        limitations: f.limitations as string | undefined,
        confidenceBand:
          (f.confidenceBand as ConfidenceBand) ?? ConfidenceBand.MEDIUM,
        confidenceScore: (f.confidenceScore as number | undefined) ?? 50,
        ...defaults,
      })),
    });
  }
}
