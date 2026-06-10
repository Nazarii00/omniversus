import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient as PrismaClientInstance } from "@/generated/prisma/client";
import type { CharacterImportBatch } from "../schema/character-import.schema";
import { CharacterImportSchema } from "../schema/character-import.schema";
import {
  computeImportDiff,
  fetchCurrentSnapshot,
  type ImportDiff,
} from "./computeImportDiff";
import { normalizeAlias } from "../actions/formUtils";
import {
  ReviewStatus,
  ProvenanceKind,
  ConfidenceBand,
} from "@/generated/prisma/enums";

// ─── Types ──────────────────────────────────────────────────────────

export interface ImportResultItem {
  subjectSlug: string;
  subjectName: string;
  action: "created" | "queued";
  subjectId?: string;
  versionId?: string;
  suggestionId?: string;
  diffSummary?: ImportDiff;
}

export interface BatchImportResult {
  items: ImportResultItem[];
  summary: {
    total: number;
    created: number;
    queued: number;
  };
}

// ─── Main batch import ──────────────────────────────────────────────

export async function importCharacterBatch(
  prisma: PrismaClientInstance,
  batch: CharacterImportBatch,
  batchId?: string,
): Promise<BatchImportResult> {
  const items: ImportResultItem[] = [];

  for (const character of batch) {
    const parsed = CharacterImportSchema.parse(character);
    const result = await processOneCharacter(prisma, parsed, batchId);
    items.push(result);
  }

  return {
    items,
    summary: {
      total: items.length,
      created: items.filter((i) => i.action === "created").length,
      queued: items.filter((i) => i.action === "queued").length,
    },
  };
}

// ─── Process one character ──────────────────────────────────────────

async function processOneCharacter(
  prisma: PrismaClientInstance,
  character: ReturnType<typeof CharacterImportSchema.parse>,
  batchId?: string,
): Promise<ImportResultItem> {
  const existing = await prisma.subject.findUnique({
    where: { slug: character.subject.slug },
    select: { id: true, displayName: true },
  });

  if (!existing) {
    // ─── NEW CHARACTER — create immediately ─────────────────────────
    const { subjectId, versionId } = await prisma.$transaction(async (tx) => {
      const subject = await tx.subject.create({
        data: {
          slug: character.subject.slug,
          displayName: character.subject.displayName,
          canonicalName: character.subject.canonicalName,
          kind: character.subject.kind,
          originMedium: character.subject.originMedium,
          originName: character.subject.originName,
          summary: character.subject.summary,
          metadata: {
            ...(character.subject.metadata as Record<string, unknown>),
            importedVia: "character-import-batch",
            batchId,
          },
        },
      });

      // Aliases
      if (character.aliases?.length) {
        const aliasValues = new Set([
          character.subject.displayName,
          character.subject.canonicalName,
          ...character.aliases,
        ]);

        await tx.subjectAlias.createMany({
          data: Array.from(aliasValues).map((value) => ({
            subjectId: subject.id,
            value,
            normalizedValue: normalizeAlias(value),
          })),
          skipDuplicates: true,
        });
      } else {
        await tx.subjectAlias.create({
          data: {
            subjectId: subject.id,
            value: character.subject.displayName,
            normalizedValue: normalizeAlias(character.subject.displayName),
          },
        });
      }

      const version = await tx.subjectVersion.create({
        data: {
          subjectId: subject.id,
          slug: character.version.slug,
          label: character.version.label,
          canonScope: character.version.canonScope,
          continuity: character.version.continuity,
          era: character.version.era,
          form: character.version.form,
          state: character.version.state,
          isDefault: character.version.isDefault ?? false,
          summary: character.version.summary,
          confidenceBand:
            character.version.confidenceBand ?? ConfidenceBand.MEDIUM,
          confidenceScore: character.version.confidenceScore ?? 50,
          status: character.version.status ?? ReviewStatus.MODEL_INFERRED,
          provenance:
            character.version.provenance ?? ProvenanceKind.IMPORTED_SOURCE,
          metadata: {
            ...(character.version.metadata as Record<string, unknown>),
            importedVia: "character-import-batch",
            batchId,
          },
        },
      });

      // Create all sub-entities
      await createSubEntities(tx, version.id, character);

      return { subjectId: subject.id, versionId: version.id };
    });

    return {
      subjectSlug: character.subject.slug,
      subjectName: character.subject.displayName,
      action: "created",
      subjectId,
      versionId,
    };
  }

  // ─── EXISTING CHARACTER — queue for approval ──────────────────────
  const currentSnapshot = await fetchCurrentSnapshot(
    prisma,
    character.subject.slug,
    character.version.slug,
  );

  const diffSummary = currentSnapshot
    ? computeImportDiff(currentSnapshot, character)
    : null;

  const suggestion = await prisma.characterImportSuggestion.create({
    data: {
      subjectSlug: character.subject.slug,
      subjectName: character.subject.displayName,
      versionSlug: character.version.slug,
      importPayload: character as unknown as Prisma.InputJsonValue,
      currentSnapshot: currentSnapshot
        ? (currentSnapshot as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      diffSummary: diffSummary
        ? (diffSummary as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      status: ReviewStatus.REQUIRES_REVIEW,
      batchId,
      metadata: {
        source: "character-import-batch",
        createdAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });

  return {
    subjectSlug: character.subject.slug,
    subjectName: character.subject.displayName,
    action: "queued",
    suggestionId: suggestion.id,
    diffSummary: diffSummary ?? undefined,
  };
}

// ─── Create sub-entities ────────────────────────────────────────────

type TransactionClient = Prisma.TransactionClient;

const SUB_ENTITY_DEFAULTS = {
  status: ReviewStatus.MODEL_INFERRED,
  provenance: ProvenanceKind.IMPORTED_SOURCE,
} as const;

function withConfidence(item: {
  confidenceBand?: unknown;
  confidenceScore?: unknown;
}): { confidenceBand: ConfidenceBand; confidenceScore: number } {
  return {
    confidenceBand:
      (item.confidenceBand as ConfidenceBand | undefined) ??
      ConfidenceBand.MEDIUM,
    confidenceScore: (item.confidenceScore as number | undefined) ?? 50,
  };
}

async function createSubEntities(
  tx: TransactionClient,
  versionId: string,
  character: ReturnType<typeof CharacterImportSchema.parse>,
) {
  if (character.capabilities?.length) {
    await tx.capabilityAssertion.createMany({
      data: character.capabilities.map((c) => ({
        versionId,
        category: c.category,
        subtype: c.subtype,
        valueText: c.valueText,
        normalizedTier: c.normalizedTier,
        normalizedValue: c.normalizedValue,
        unit: c.unit,
        context: c.context,
        limitations: c.limitations,
        contested: c.contested ?? false,
        notes: c.notes,
        ...withConfidence(c),
        ...SUB_ENTITY_DEFAULTS,
      })),
    });
  }

  if (character.abilities?.length) {
    await tx.ability.createMany({
      data: character.abilities.map((a) => ({
        versionId,
        name: a.name,
        type: a.type,
        description: a.description,
        activation: a.activation,
        delivery: a.delivery,
        rangeText: a.rangeText,
        timing: a.timing,
        targetRequirement: a.targetRequirement,
        effect: a.effect,
        limitations: a.limitations,
        counterplay: a.counterplay,
        isPassive: a.isPassive ?? false,
        ...withConfidence(a),
        ...SUB_ENTITY_DEFAULTS,
      })),
    });
  }

  if (character.resistances?.length) {
    await tx.resistance.createMany({
      data: character.resistances.map((r) => ({
        versionId,
        type: r.type,
        name: r.name,
        basis: r.basis,
        limits: r.limits,
        ...withConfidence(r),
        ...SUB_ENTITY_DEFAULTS,
      })),
    });
  }

  if (character.weaknesses?.length) {
    await tx.weakness.createMany({
      data: character.weaknesses.map((w) => ({
        versionId,
        name: w.name,
        description: w.description,
        exploitation: w.exploitation,
        severity: w.severity ?? ConfidenceBand.MEDIUM,
        ...withConfidence(w),
        ...SUB_ENTITY_DEFAULTS,
      })),
    });
  }

  if (character.conditions?.length) {
    await tx.winLossCondition.createMany({
      data: character.conditions.map((c) => ({
        versionId,
        kind: c.kind,
        type: c.type,
        method: c.method,
        requires: c.requires,
        blockedBy: c.blockedBy,
        probabilityText: c.probabilityText,
        ...withConfidence(c),
        ...SUB_ENTITY_DEFAULTS,
      })),
    });
  }

  if (character.equipment?.length) {
    await tx.equipmentItem.createMany({
      data: character.equipment.map((e) => ({
        versionId,
        name: e.name,
        category: e.category,
        description: e.description,
        standard: e.standard ?? true,
        availabilityPolicy: e.availabilityPolicy,
        limitations: e.limitations,
        ...SUB_ENTITY_DEFAULTS,
      })),
    });
  }

  if (character.feats?.length) {
    await tx.featAssertion.createMany({
      data: character.feats.map((f) => ({
        versionId,
        kind: f.kind,
        category: f.category,
        title: f.title,
        description: f.description,
        scaleText: f.scaleText,
        context: f.context,
        limitations: f.limitations,
        ...withConfidence(f),
        ...SUB_ENTITY_DEFAULTS,
      })),
    });
  }
}
