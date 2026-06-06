import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ReviewStatus, UserAppealKind } from "@/generated/prisma/enums";
import { getPrisma } from "@/server/db/prisma";

export const runtime = "nodejs";

const SubjectRequestSchema = z.object({
  subjectName: z.string().trim().min(1, "Subject Alias is required").max(220),
  universe: z.string().trim().min(1, "Universe / Origin is required").max(220),
  intelSources: z.string().trim().max(2000).optional(),
  photoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  keyFeats: z.string().trim().max(4000).optional(),
  additionalNotes: z.string().trim().max(4000).optional(),
  submitterName: z.string().trim().max(160).optional(),
});


function nullableString(value: string | undefined): string | null {
  return value?.trim() || null;
}

export async function POST(request: NextRequest) {
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json(
      {
        error:
          "Subject requests are unavailable until DATABASE_URL or DIRECT_URL is set",
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

  const parsed = SubjectRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Payload is invalid",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // We construct the `body` field of UserAppeal from notes and feats
  const bodyParts = [];
  if (data.keyFeats) {
    bodyParts.push(`[KEY FEATS & EVIDENCE]\n${data.keyFeats}`);
  }
  if (data.additionalNotes) {
    bodyParts.push(`[ADDITIONAL NOTES]\n${data.additionalNotes}`);
  }
  
  const appealBody = bodyParts.join("\n\n").trim() || "No additional information provided.";

  try {
    const createdAppeal = await prisma.userAppeal.create({
      data: {
        kind: UserAppealKind.SUBJECT_REQUEST,
        status: ReviewStatus.REQUIRES_REVIEW,
        subjectName: data.subjectName,
        title: `Subject Request: ${data.subjectName}`,
        body: appealBody,
        proposedText: data.universe, // We use proposedText to store Universe/Origin
        sourceRef: nullableString(data.intelSources),
        submitterName: nullableString(data.submitterName),
        metadata: {
          createdFrom: "home-arena-dossier-form",
          photoUrl: data.photoUrl || null,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    return NextResponse.json(
      {
        appealId: createdAppeal.id,
        status: createdAppeal.status,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[SUBJECT_REQUEST] Failed to save request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
