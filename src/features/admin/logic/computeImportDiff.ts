import type { CharacterImport } from "../schema/character-import.schema";
import type { PrismaClientInstance } from "@/server/db/prisma";

// ─── Types ──────────────────────────────────────────────────────────

type JsonRecord = Record<string, unknown>;

interface DiffSection {
  added: number;
  modified: number;
  removed: number;
  details: DiffDetail[];
}

interface DiffDetail {
  action: "add" | "modify" | "remove";
  entity: string;
  field?: string;
  current?: string;
  proposed?: string;
}

export interface ImportDiff {
  subject: DiffSection;
  version: DiffSection;
  capabilities: DiffSection;
  abilities: DiffSection;
  resistances: DiffSection;
  weaknesses: DiffSection;
  conditions: DiffSection;
  equipment: DiffSection;
  feats: DiffSection;
  aliases: DiffSection;
  summary: {
    totalAdded: number;
    totalModified: number;
    totalRemoved: number;
  };
}

// ─── Snapshot ───────────────────────────────────────────────────────

interface CurrentSnapshot {
  subject: JsonRecord;
  version: JsonRecord;
  aliases: string[];
  capabilities: JsonRecord[];
  abilities: JsonRecord[];
  resistances: JsonRecord[];
  weaknesses: JsonRecord[];
  conditions: JsonRecord[];
  equipment: JsonRecord[];
  feats: JsonRecord[];
}

// ─── Fetch current state ────────────────────────────────────────────

export async function fetchCurrentSnapshot(
  prisma: PrismaClientInstance,
  subjectSlug: string,
  versionSlug?: string,
): Promise<CurrentSnapshot | null> {
  const subject = await prisma.subject.findUnique({
    where: { slug: subjectSlug },
    include: {
      aliases: { select: { value: true } },
    },
  });

  if (!subject) return null;

  const versionWhere = {
    subjectId: subject.id,
    ...(versionSlug ? { slug: versionSlug } : { isDefault: true }),
  };

  const version = await prisma.subjectVersion.findFirst({
    where: versionWhere,
  });

  if (!version) return null;

  const [
    capabilities,
    abilities,
    resistances,
    weaknesses,
    conditions,
    equipment,
    feats,
  ] = await Promise.all([
    prisma.capabilityAssertion.findMany({ where: { versionId: version.id } }),
    prisma.ability.findMany({ where: { versionId: version.id } }),
    prisma.resistance.findMany({ where: { versionId: version.id } }),
    prisma.weakness.findMany({ where: { versionId: version.id } }),
    prisma.winLossCondition.findMany({ where: { versionId: version.id } }),
    prisma.equipmentItem.findMany({ where: { versionId: version.id } }),
    prisma.featAssertion.findMany({ where: { versionId: version.id } }),
  ]);

  return {
    subject: {
      displayName: subject.displayName,
      canonicalName: subject.canonicalName,
      kind: subject.kind,
      originMedium: subject.originMedium,
      originName: subject.originName,
      summary: subject.summary,
    },
    version: {
      label: version.label,
      canonScope: version.canonScope,
      continuity: version.continuity,
      era: version.era,
      form: version.form,
      state: version.state,
      isDefault: version.isDefault,
      summary: version.summary,
    },
    aliases: subject.aliases.map((a) => a.value),
    capabilities: capabilities.map(stripMeta),
    abilities: abilities.map(stripMeta),
    resistances: resistances.map(stripMeta),
    weaknesses: weaknesses.map(stripMeta),
    conditions: conditions.map(stripMeta),
    equipment: equipment.map(stripMeta),
    feats: feats.map(stripMeta),
  };
}

// ─── Compute diff ───────────────────────────────────────────────────

export function computeImportDiff(
  current: CurrentSnapshot,
  imported: CharacterImport,
): ImportDiff {
  const subjectDiff = diffSingle(
    current.subject,
    {
      displayName: imported.subject.displayName,
      canonicalName: imported.subject.canonicalName,
      kind: imported.subject.kind,
      originMedium: imported.subject.originMedium,
      originName: imported.subject.originName ?? null,
      summary: imported.subject.summary ?? null,
    },
    "subject",
  );

  const versionDiff = diffSingle(
    current.version,
    {
      label: imported.version.label,
      canonScope: imported.version.canonScope,
      continuity: imported.version.continuity ?? null,
      era: imported.version.era ?? null,
      form: imported.version.form ?? null,
      state: imported.version.state ?? null,
      isDefault: imported.version.isDefault ?? null,
      summary: imported.version.summary ?? null,
    },
    "version",
  );

  const aliasesDiff = diffStringList(
    current.aliases,
    imported.aliases ?? [],
    "alias",
  );

  const capabilitiesDiff = diffList(
    current.capabilities,
    imported.capabilities ?? [],
    (c) => `${String(c.category)}${c.subtype ? ` / ${String(c.subtype)}` : ""}`,
    "capability",
  );

  const abilitiesDiff = diffList(
    current.abilities,
    imported.abilities ?? [],
    (a) => String(a.name),
    "ability",
  );

  const resistancesDiff = diffList(
    current.resistances,
    imported.resistances ?? [],
    (r) => String(r.name),
    "resistance",
  );

  const weaknessesDiff = diffList(
    current.weaknesses,
    imported.weaknesses ?? [],
    (w) => String(w.name),
    "weakness",
  );

  const conditionsDiff = diffList(
    current.conditions,
    imported.conditions ?? [],
    (c) =>
      `${String(c.kind)} / ${String(c.type)} — ${truncate(String(c.method), 40)}`,
    "condition",
  );

  const equipmentDiff = diffList(
    current.equipment,
    imported.equipment ?? [],
    (e) => String(e.name),
    "equipment",
  );

  const featsDiff = diffList(
    current.feats,
    imported.feats ?? [],
    (f) => String(f.title),
    "feat",
  );

  const summary = {
    totalAdded:
      subjectDiff.added +
      versionDiff.added +
      aliasesDiff.added +
      capabilitiesDiff.added +
      abilitiesDiff.added +
      resistancesDiff.added +
      weaknessesDiff.added +
      conditionsDiff.added +
      equipmentDiff.added +
      featsDiff.added,
    totalModified:
      subjectDiff.modified +
      versionDiff.modified +
      aliasesDiff.modified +
      capabilitiesDiff.modified +
      abilitiesDiff.modified +
      resistancesDiff.modified +
      weaknessesDiff.modified +
      conditionsDiff.modified +
      equipmentDiff.modified +
      featsDiff.modified,
    totalRemoved:
      subjectDiff.removed +
      versionDiff.removed +
      aliasesDiff.removed +
      capabilitiesDiff.removed +
      abilitiesDiff.removed +
      resistancesDiff.removed +
      weaknessesDiff.removed +
      conditionsDiff.removed +
      equipmentDiff.removed +
      featsDiff.removed,
  };

  return {
    subject: subjectDiff,
    version: versionDiff,
    aliases: aliasesDiff,
    capabilities: capabilitiesDiff,
    abilities: abilitiesDiff,
    resistances: resistancesDiff,
    weaknesses: weaknessesDiff,
    conditions: conditionsDiff,
    equipment: equipmentDiff,
    feats: featsDiff,
    summary,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function diffSingle(
  current: JsonRecord,
  proposed: JsonRecord,
  entity: string,
): DiffSection {
  const details: DiffDetail[] = [];
  let added = 0;
  let modified = 0;
  const removed = 0;

  for (const [key, proposedValue] of Object.entries(proposed)) {
    const currentValue = current[key];

    if (currentValue === undefined || currentValue === null) {
      if (proposedValue !== null && proposedValue !== undefined) {
        added++;
        details.push({
          action: "add",
          entity,
          field: key,
          proposed: String(proposedValue),
        });
      }
    } else if (String(currentValue) !== String(proposedValue)) {
      modified++;
      details.push({
        action: "modify",
        entity,
        field: key,
        current: String(currentValue),
        proposed: String(proposedValue),
      });
    }
  }

  return { added, modified, removed, details };
}

function diffList<T extends JsonRecord>(
  current: T[],
  proposed: T[],
  keyFn: (item: T) => string,
  entityLabel: string,
): DiffSection {
  const details: DiffDetail[] = [];
  let added = 0;
  let modified = 0;
  let removed = 0;

  const currentMap = new Map<string, T>();
  for (const item of current) {
    currentMap.set(keyFn(item), item);
  }

  const proposedMap = new Map<string, T>();
  for (const item of proposed) {
    proposedMap.set(keyFn(item), item);
  }

  const allKeys = new Set([...currentMap.keys(), ...proposedMap.keys()]);

  for (const key of allKeys) {
    const cur = currentMap.get(key);
    const prop = proposedMap.get(key);

    if (!cur && prop) {
      added++;
      details.push({ action: "add", entity: `${entityLabel}: ${key}` });
    } else if (cur && !prop) {
      removed++;
      details.push({ action: "remove", entity: `${entityLabel}: ${key}` });
    } else if (cur && prop) {
      const curJson = JSON.stringify(sortKeys(cur));
      const propJson = JSON.stringify(sortKeys(prop));
      if (curJson !== propJson) {
        modified++;
        details.push({
          action: "modify",
          entity: `${entityLabel}: ${key}`,
          current: summarize(cur),
          proposed: summarize(prop),
        });
      }
    }
  }

  return { added, modified, removed, details };
}

function diffStringList(
  current: string[],
  proposed: string[],
  entityLabel: string,
): DiffSection {
  const details: DiffDetail[] = [];
  const currentSet = new Set(current);
  const proposedSet = new Set(proposed);
  let added = 0;
  let removed = 0;

  for (const alias of proposedSet) {
    if (!currentSet.has(alias)) {
      added++;
      details.push({ action: "add", entity: `${entityLabel}: ${alias}` });
    }
  }

  for (const alias of currentSet) {
    if (!proposedSet.has(alias)) {
      removed++;
      details.push({ action: "remove", entity: `${entityLabel}: ${alias}` });
    }
  }

  return { added, modified: 0, removed, details };
}

// ─── Utilities ──────────────────────────────────────────────────────

function stripMeta<
  T extends {
    createdAt?: unknown;
    updatedAt?: unknown;
    id?: unknown;
    versionId?: unknown;
    metadata?: unknown;
  },
>(record: T): JsonRecord {
  const { createdAt, updatedAt, id, versionId, metadata, ...rest } = record;
  return rest as unknown as JsonRecord;
}

function sortKeys(obj: JsonRecord): JsonRecord {
  const sorted: JsonRecord = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}

function summarize(obj: JsonRecord): string {
  const relevant = Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${truncate(String(v), 30)}`)
    .join(", ");
  return relevant || "(empty)";
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max) + "…";
}
