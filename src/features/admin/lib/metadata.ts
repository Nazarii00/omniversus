import type { Prisma } from "@/generated/prisma/client";

type JsonObject = Record<string, Prisma.InputJsonValue>;

export function metadataObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

export function mergeMetadata(
  current: unknown,
  patch: JsonObject,
): Prisma.InputJsonObject {
  return {
    ...metadataObject(current),
    ...patch,
  };
}
