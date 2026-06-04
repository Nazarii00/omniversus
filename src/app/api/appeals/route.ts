import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ReviewStatus, UserAppealKind } from "@/generated/prisma/enums";
import { getPrisma } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AppealSchema = z.object({
  reportId: z.string().trim().min(1).max(160),
  reportTitle: z.string().trim().min(1).max(220),
  targetType: z.enum(["claim", "premise"]),
  targetId: z.string().trim().min(1).max(160),
  targetText: z.string().trim().min(1).max(4000),
  subjectName: z.string().trim().min(1).max(220),
  subjectVersion: z.string().trim().max(220).optional(),
  side: z.string().trim().max(24).optional(),
  category: z.string().trim().max(120).optional(),
  claimId: z.string().trim().max(160).optional(),
  chainId: z.string().trim().max(160).optional(),
  sourceRef: z.string().trim().max(1000).optional(),
  confidence: z.number().min(0).max(100).optional(),
  body: z.string().trim().min(10).max(4000),
  proposedText: z.string().trim().max(4000).optional(),
  submitterName: z.string().trim().max(160).optional(),
  submitterContact: z.string().trim().max(220).optional(),
});

type AppealInput = z.infer<typeof AppealSchema>;

function nullableString(value: string | undefined): string | null {
  return value?.trim() || null;
}

function normalizeAlias(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function resolveTargetVersionId(appeal: AppealInput) {
  const prisma = getPrisma();
  if (!prisma) return null;

  const normalizedSubject = normalizeAlias(appeal.subjectName);
  const subject = await prisma.subject.findFirst({
    where: {
      OR: [
        { displayName: appeal.subjectName },
        { canonicalName: appeal.subjectName },
        {
          aliases: {
            some: {
              normalizedValue: normalizedSubject,
            },
          },
        },
      ],
    },
    select: {
      versions: {
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          label: true,
        },
      },
    },
  });

  if (!subject?.versions.length) return null;

  const requestedVersion = appeal.subjectVersion?.trim().toLowerCase();
  const version = requestedVersion
    ? subject.versions.find(
        (item) => item.label.trim().toLowerCase() === requestedVersion,
      )
    : subject.versions[0];

  return version?.id ?? subject.versions[0].id;
}

function appealTitle(appeal: AppealInput): string {
  return `Review ${appeal.targetType} ${appeal.targetId}`;
}

function sourceRef(appeal: AppealInput): string | null {
  const refs = [
    appeal.sourceRef,
    `${appeal.reportTitle} / ${appeal.targetType.toUpperCase()} ${appeal.targetId}`,
  ]
    .flatMap((value) => (value?.trim() ? [value.trim()] : []))
    .join(" | ");

  return refs || null;
}

export async function POST(request: NextRequest) {
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json(
      {
        error:
          "Appeals are unavailable until DATABASE_URL or DIRECT_URL is set",
      },
      { status: 503 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const parsed = AppealSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Appeal payload is invalid",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const appeal = parsed.data;
  const targetVersionId = await resolveTargetVersionId(appeal);
  const createdAppeal = await prisma.userAppeal.create({
    data: {
      kind: UserAppealKind.INFO_APPEAL,
      status: ReviewStatus.REQUIRES_REVIEW,
      subjectName: appeal.subjectName,
      targetVersionId,
      title: appealTitle(appeal),
      body: appeal.body,
      proposedText: nullableString(appeal.proposedText),
      sourceRef: sourceRef(appeal),
      submitterName: nullableString(appeal.submitterName),
      submitterContact: nullableString(appeal.submitterContact),
      metadata: {
        createdFrom: "full-battle-report",
        report: {
          id: appeal.reportId,
          title: appeal.reportTitle,
        },
        target: {
          type: appeal.targetType,
          id: appeal.targetId,
          text: appeal.targetText,
          side: appeal.side ?? null,
          category: appeal.category ?? null,
          claimId: appeal.claimId ?? null,
          chainId: appeal.chainId ?? null,
          confidence: appeal.confidence ?? null,
        },
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  revalidatePath("/admin/appeals");

  return NextResponse.json(
    {
      appealId: createdAppeal.id,
      status: createdAppeal.status,
    },
    { status: 201 },
  );
}
