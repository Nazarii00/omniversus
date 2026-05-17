"use server";

import { revalidatePath } from "next/cache";

import {
  CanonScope,
  ConfidenceBand,
  OriginMedium,
  ProvenanceKind,
  ReviewStatus,
  SubjectKind,
  UserAppealKind,
} from "@/generated/prisma/enums";

import {
  assertAdminEnabled,
  normalizeAlias,
  optionalString,
  prismaOrThrow,
  requiredString,
  slugify,
} from "./formUtils";

type JsonObject = Record<string, unknown>;

function jsonObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function fallbackSlug(value: string, id: string): string {
  return slugify(value) || `subject-${id.slice(0, 8)}`;
}

function appealBodyText(appeal: {
  body: string;
  proposedText: string | null;
}): string {
  return appeal.proposedText?.trim() || appeal.body.trim();
}

export async function resolveUserAppealAction(formData: FormData) {
  assertAdminEnabled();
  const prisma = prismaOrThrow();

  const appealId = requiredString(formData, "appealId", "Appeal");
  const decision = requiredString(formData, "decision", "Decision");
  const resolutionNote = optionalString(formData, "resolutionNote");
  const reviewedAt = new Date();

  await prisma.$transaction(async (tx) => {
    const appeal = await tx.userAppeal.findUniqueOrThrow({
      where: { id: appealId },
    });
    const baseMetadata = {
      ...jsonObject(appeal.metadata),
      reviewedFrom: "admin-appeals",
    };

    if (decision === "reject") {
      await tx.userAppeal.update({
        where: { id: appeal.id },
        data: {
          status: ReviewStatus.REJECTED,
          reviewedAt,
          resolutionNote,
          metadata: baseMetadata,
        },
      });
      return;
    }

    if (decision !== "approve") {
      throw new Error("Unknown appeal decision");
    }

    if (appeal.kind === UserAppealKind.SUBJECT_REQUEST) {
      const displayName = appeal.subjectName.trim();
      const subjectSlug = fallbackSlug(displayName, appeal.id);
      const versionSlug = "primary-canon";

      const subject = await tx.subject.upsert({
        where: { slug: subjectSlug },
        update: {
          displayName,
          canonicalName: displayName,
          summary: appealBodyText(appeal),
          metadata: {
            ...baseMetadata,
            updatedFromUserAppealId: appeal.id,
          },
        },
        create: {
          slug: subjectSlug,
          displayName,
          canonicalName: displayName,
          kind: SubjectKind.FICTIONAL_CHARACTER,
          originMedium: OriginMedium.UNKNOWN,
          summary: appealBodyText(appeal),
          metadata: {
            ...baseMetadata,
            createdFromUserAppealId: appeal.id,
          },
        },
      });

      const existingDefault = await tx.subjectVersion.findFirst({
        where: {
          subjectId: subject.id,
          isDefault: true,
        },
        select: {
          id: true,
        },
      });

      const version = await tx.subjectVersion.upsert({
        where: {
          subjectId_slug: {
            subjectId: subject.id,
            slug: versionSlug,
          },
        },
        update: {
          summary: appealBodyText(appeal),
          metadata: {
            ...baseMetadata,
            updatedFromUserAppealId: appeal.id,
          },
        },
        create: {
          subjectId: subject.id,
          slug: versionSlug,
          label: "Primary canon",
          canonScope: CanonScope.PRIMARY_CANON,
          isDefault: !existingDefault,
          summary: appealBodyText(appeal),
          confidenceBand: ConfidenceBand.LOW,
          confidenceScore: 35,
          status: ReviewStatus.REQUIRES_REVIEW,
          provenance: ProvenanceKind.MANUAL_DB,
          metadata: {
            ...baseMetadata,
            createdFromUserAppealId: appeal.id,
          },
        },
      });

      await tx.subjectAlias.upsert({
        where: {
          subjectId_normalizedValue: {
            subjectId: subject.id,
            normalizedValue: normalizeAlias(displayName),
          },
        },
        update: {
          value: displayName,
        },
        create: {
          subjectId: subject.id,
          value: displayName,
          normalizedValue: normalizeAlias(displayName),
        },
      });

      await tx.userAppeal.update({
        where: { id: appeal.id },
        data: {
          status: ReviewStatus.ACCEPTED,
          reviewedAt,
          resolutionNote,
          createdSubjectId: subject.id,
          createdVersionId: version.id,
          metadata: {
            ...baseMetadata,
            createdSubjectId: subject.id,
            createdVersionId: version.id,
          },
        },
      });
      return;
    }

    let createdFactSuggestionId: string | null = null;

    if (appeal.targetVersionId) {
      const suggestion = await tx.factSuggestion.create({
        data: {
          versionId: appeal.targetVersionId,
          subjectName: appeal.subjectName,
          targetKind: "USER_INFO_APPEAL",
          category: null,
          fieldPath: null,
          proposedText: appealBodyText(appeal),
          sourceRef: appeal.sourceRef,
          confidenceBand: ConfidenceBand.MEDIUM,
          confidenceScore: 60,
          reason: appeal.title ?? "User information appeal accepted",
          status: ReviewStatus.ACCEPTED,
          provenance: ProvenanceKind.MANUAL_DB,
          metadata: {
            ...baseMetadata,
            createdFromUserAppealId: appeal.id,
          },
        },
      });

      createdFactSuggestionId = suggestion.id;
    }

    await tx.userAppeal.update({
      where: { id: appeal.id },
      data: {
        status: ReviewStatus.ACCEPTED,
        reviewedAt,
        resolutionNote,
        metadata: {
          ...baseMetadata,
          createdFactSuggestionId,
        },
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/appeals");
}
