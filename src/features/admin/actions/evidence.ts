import {
  EvidenceSourceType,
  ReviewStatus,
  SourceReliability,
} from "@/generated/prisma/enums";
import type { PrismaClientInstance } from "@/server/db/prisma";

import { optionalString, readScore } from "./formUtils";

async function maybeCreateEvidenceSource(
  prisma: PrismaClientInstance,
  formData: FormData,
) {
  const title = optionalString(formData, "sourceTitle");
  const citation = optionalString(formData, "sourceCitation");
  const url = optionalString(formData, "sourceUrl");

  if (!title && !citation && !url) return null;

  return prisma.evidenceSource.create({
    data: {
      type: EvidenceSourceType.MANUAL_NOTE,
      title: title ?? "Manual admin note",
      citation,
      url,
      reliability: SourceReliability.SECONDARY,
      status: ReviewStatus.REQUIRES_REVIEW,
      metadata: {
        createdFrom: "admin-panel",
      },
    },
  });
}

export async function createEvidenceLink(
  prisma: PrismaClientInstance,
  formData: FormData,
  target:
    | { capabilityId: string }
    | { abilityId: string }
    | { weaknessId: string }
    | { conditionId: string }
    | { equipmentId: string },
) {
  const source = await maybeCreateEvidenceSource(prisma, formData);
  const note = optionalString(formData, "evidenceNote");

  if (!source && !note) return;

  await prisma.evidenceLink.create({
    data: {
      sourceId: source?.id,
      note,
      relevanceScore: readScore(formData, "relevanceScore", 70),
      metadata: {
        createdFrom: "admin-panel",
      },
      ...target,
    },
  });
}
