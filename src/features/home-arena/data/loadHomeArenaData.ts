import { getPrisma } from "@/server/db/prisma";

import type { CombatantOption } from "../model";

const HOME_COMBATANT_LIMIT = 120;

export async function loadHomeArenaCombatants(): Promise<CombatantOption[]> {
  const prisma = getPrisma();

  if (!prisma) return [];

  try {
    const subjects = await prisma.subject.findMany({
      take: HOME_COMBATANT_LIMIT,
      orderBy: [{ displayName: "asc" }],
      include: {
        aliases: {
          orderBy: { value: "asc" },
        },
        versions: {
          take: 8,
          orderBy: [
            { isDefault: "desc" },
            { confidenceScore: "desc" },
            { updatedAt: "desc" },
          ],
        },
      },
    });

    const options = subjects.map((subject) => {
      const version = chooseHomeVersion(subject.versions);
      const versionHasPortrait = Boolean(
        portraitDataUrlFromMetadata(version?.metadata),
      );
      const subjectPortraitDataUrl = portraitDataUrlFromMetadata(
        subject.metadata,
      );
      const aliases = uniqueStrings([
        subject.canonicalName,
        ...subject.aliases.map((alias) => alias.value),
      ]).filter((alias) => alias !== subject.displayName);

      return {
        aliases,
        id: version?.id ?? subject.id,
        name: subject.displayName,
        portraitUrl:
          version && versionHasPortrait
            ? `/api/portraits/${version.id}`
            : subjectPortraitDataUrl,
        subjectId: subject.id,
        summary: version?.summary ?? subject.summary ?? undefined,
        universe: subject.originName ?? formatEnumLabel(subject.originMedium),
        versionId: version?.id,
        versionLabel: version?.label,
      };
    });

    return options;
  } catch {
    return [];
  }
}

function chooseHomeVersion<TVersion extends { metadata: unknown }>(
  versions: TVersion[],
) {
  return (
    versions.find((version) => portraitDataUrlFromMetadata(version.metadata)) ??
    versions[0] ??
    null
  );
}

function portraitDataUrlFromMetadata(metadata: unknown) {
  const root = asRecord(metadata);
  const portrait = asRecord(root.portrait);
  const dataUrl = portrait.dataUrl;

  return typeof dataUrl === "string" && dataUrl.startsWith("data:image/")
    ? dataUrl
    : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    const normalized = trimmed?.toLowerCase();

    if (!trimmed || !normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    result.push(trimmed);
  }

  return result;
}

function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
