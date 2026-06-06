import { getPrisma } from "@/server/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PortraitRouteContext = {
  params: Promise<{
    versionId: string;
  }>;
};

export async function GET(_request: Request, context: PortraitRouteContext) {
  const prisma = getPrisma();

  if (!prisma) {
    return new Response("Database is not configured", { status: 503 });
  }

  const { versionId } = await context.params;
  const version = await prisma.subjectVersion
    .findUnique({
      where: { id: versionId },
      select: { metadata: true },
    })
    .catch(() => null);
  const portraitDataUrl = portraitDataUrlFromMetadata(version?.metadata);

  if (!portraitDataUrl) {
    return new Response("Portrait not found", { status: 404 });
  }

  const image = decodeDataUrl(portraitDataUrl);

  if (!image) {
    return new Response("Portrait data is invalid", { status: 422 });
  }

  return new Response(image.body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": image.contentType,
    },
  });
}

function portraitDataUrlFromMetadata(metadata: unknown) {
  const root = asRecord(metadata);
  const portrait = asRecord(root.portrait);
  const dataUrl = portrait.dataUrl;

  return typeof dataUrl === "string" && dataUrl.startsWith("data:image/")
    ? dataUrl
    : undefined;
}

function decodeDataUrl(dataUrl: string) {
  const match = /^data:([^;,]+);base64,(.+)$/u.exec(dataUrl);

  if (!match) return null;

  return {
    body: Buffer.from(match[2] ?? "", "base64"),
    contentType: match[1] ?? "image/png",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
