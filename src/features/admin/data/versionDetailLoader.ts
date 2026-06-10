import { getPrisma } from "@/server/db/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(item: Record<string, any>): Record<string, any> {
  return JSON.parse(JSON.stringify(item));
}

export async function loadVersionDetail(versionId: string) {
  const p = getPrisma();
  if (!p) return null;

  const [abilities, capabilities, weaknesses, conditions, equipment, feats] =
    await Promise.all([
      p.ability.findMany({
        where: { versionId },
        orderBy: { createdAt: "asc" },
      }),
      p.capabilityAssertion.findMany({
        where: { versionId },
        orderBy: { createdAt: "asc" },
      }),
      p.weakness.findMany({
        where: { versionId },
        orderBy: { createdAt: "asc" },
      }),
      p.winLossCondition.findMany({
        where: { versionId },
        orderBy: { createdAt: "asc" },
      }),
      p.equipmentItem.findMany({
        where: { versionId },
        orderBy: { createdAt: "asc" },
      }),
      p.featAssertion.findMany({
        where: { versionId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  return {
    abilities: abilities.map(normalize),
    capabilities: capabilities.map(normalize),
    weaknesses: weaknesses.map(normalize),
    conditions: conditions.map(normalize),
    equipment: equipment.map(normalize),
    feats: feats.map(normalize),
  };
}

export type VersionDetailData = NonNullable<
  Awaited<ReturnType<typeof loadVersionDetail>>
>;
