import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma/client";
import { isAdminEnabled } from "@/features/admin/data";
import {
  mergeMetadata,
  metadataObject,
} from "@/features/admin/lib/metadata";
import { getPrisma } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DATA_URL_LENGTH = 8_000_000;

type SavePortraitRequest = {
  dataUrl?: string;
  settings?: unknown;
  sourceName?: string;
  versionId?: string;
};

export async function POST(request: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { error: "Admin panel is disabled" },
      { status: 403 },
    );
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { error: "DATABASE_URL or DIRECT_URL is required" },
      { status: 503 },
    );
  }

  const payload = (await request.json()) as SavePortraitRequest;

  if (!payload.versionId) {
    return NextResponse.json({ error: "versionId is required" }, { status: 400 });
  }

  if (!payload.dataUrl?.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "Portrait dataUrl must be a data:image URL" },
      { status: 400 },
    );
  }

  if (payload.dataUrl.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json(
      { error: "Portrait image is too large for metadata storage" },
      { status: 413 },
    );
  }

  const version = await prisma.subjectVersion.findUnique({
    where: { id: payload.versionId },
    select: { metadata: true },
  });

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const portrait: Record<string, Prisma.InputJsonValue> = {
    approvedAt: new Date().toISOString(),
    dataUrl: payload.dataUrl,
    kind: "admin-processed",
    settings: metadataObject(payload.settings),
    sourceName: payload.sourceName ?? "",
    updatedFrom: "admin-portrait-studio",
  };

  await prisma.subjectVersion.update({
    where: { id: payload.versionId },
    data: {
      metadata: mergeMetadata(version.metadata, { portrait }),
    },
  });

  revalidatePath("/admin");

  return NextResponse.json({ ok: true });
}
