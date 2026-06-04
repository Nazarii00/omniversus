import { NextResponse } from "next/server";

import { findSubject } from "@/server/battle/dossier/repository";
import { getPrisma } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PortraitRequestFighter = {
  name?: unknown;
  side?: unknown;
};

type PortraitRequest = {
  fighters?: unknown;
};

type FighterSide = "A" | "B";

export async function POST(request: Request) {
  const prisma = getPrisma();

  if (!prisma) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | PortraitRequest
    | null;
  const fighters = parseFighters(payload?.fighters);

  if (!fighters.length) {
    return NextResponse.json(
      { error: "fighters are required" },
      { status: 400 },
    );
  }

  const entries = await Promise.all(
    fighters.map(async (fighter) => {
      const portrait = await findPortraitForName(fighter.name);

      return [fighter.side, portrait] as const;
    }),
  );

  return NextResponse.json({
    portraits: Object.fromEntries(
      entries.filter((entry) => Boolean(entry[1])),
    ),
  });
}

async function findPortraitForName(name: string) {
  const prisma = getPrisma();
  if (!prisma) return null;

  const subject = await findSubject(name);

  if (!subject) return null;

  const versions = await prisma.subjectVersion.findMany({
    where: { subjectId: subject.id },
    take: 8,
    orderBy: [
      { isDefault: "desc" },
      { confidenceScore: "desc" },
      { updatedAt: "desc" },
    ],
    select: {
      metadata: true,
    },
  });
  const portrait = versions
    .map((version) => portraitFromMetadata(version.metadata))
    .find(Boolean);

  return portrait ?? null;
}

function parseFighters(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): Array<{ name: string; side: FighterSide }> => {
    const fighter = item as PortraitRequestFighter;
    const side = fighter.side === "A" || fighter.side === "B"
      ? fighter.side
      : null;
    const name = typeof fighter.name === "string" ? fighter.name.trim() : "";

    return side && name ? [{ name, side }] : [];
  });
}

function portraitFromMetadata(metadata: unknown) {
  const root = asRecord(metadata);
  const portrait = asRecord(root.portrait);
  const dataUrl = readString(portrait.dataUrl);

  if (!dataUrl?.startsWith("data:image/")) return null;

  return {
    approved_at: readString(portrait.approvedAt) ?? "",
    data_url: dataUrl,
    source_name: readString(portrait.sourceName) ?? "",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
