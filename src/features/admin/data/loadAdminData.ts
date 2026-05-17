import { getPrisma, hasDatabaseUrl } from "@/server/db/prisma";

export type AdminData = Awaited<ReturnType<typeof loadAdminData>>;
export type LoadedAdminData = NonNullable<AdminData>;

export type VersionOption = LoadedAdminData["versions"][number];

export function isAdminEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ADMIN_PANEL_ENABLED === "true"
  );
}

export function hasAdminDatabase(): boolean {
  return hasDatabaseUrl();
}

export async function loadAdminData() {
  const prisma = getPrisma();

  if (!prisma) return null;

  const [
    subjectCount,
    versionCount,
    capabilityCount,
    abilityCount,
    evidenceSourceCount,
    evidenceLinkCount,
    battleRunCount,
    subjects,
    versions,
    recentCapabilities,
    recentAbilities,
    recentConditions,
    recentRuns,
    rulesets,
    environments,
    modifiers,
  ] = await Promise.all([
    prisma.subject.count(),
    prisma.subjectVersion.count(),
    prisma.capabilityAssertion.count(),
    prisma.ability.count(),
    prisma.evidenceSource.count(),
    prisma.evidenceLink.count(),
    prisma.battleRun.count(),
    prisma.subject.findMany({
      take: 24,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        aliases: {
          orderBy: { value: "asc" },
        },
        versions: {
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
          include: {
            _count: {
              select: {
                capabilities: true,
                abilities: true,
                resistances: true,
                equipment: true,
                weaknesses: true,
                conditions: true,
                feats: true,
              },
            },
          },
        },
      },
    }),
    prisma.subjectVersion.findMany({
      orderBy: [
        { subject: { displayName: "asc" } },
        { isDefault: "desc" },
        { label: "asc" },
      ],
      include: {
        subject: true,
      },
    }),
    prisma.capabilityAssertion.findMany({
      take: 10,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        version: {
          include: {
            subject: true,
          },
        },
      },
    }),
    prisma.ability.findMany({
      take: 10,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        version: {
          include: {
            subject: true,
          },
        },
      },
    }),
    prisma.winLossCondition.findMany({
      take: 10,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        version: {
          include: {
            subject: true,
          },
        },
      },
    }),
    prisma.battleRun.findMany({
      take: 8,
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.battleRuleset.findMany({
      orderBy: { slug: "asc" },
    }),
    prisma.battleEnvironment.findMany({
      orderBy: { slug: "asc" },
    }),
    prisma.modifier.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    }),
  ]);

  return {
    counts: {
      subjects: subjectCount,
      versions: versionCount,
      capabilities: capabilityCount,
      abilities: abilityCount,
      evidenceSources: evidenceSourceCount,
      evidenceLinks: evidenceLinkCount,
      battleRuns: battleRunCount,
    },
    subjects,
    versions,
    recentCapabilities,
    recentAbilities,
    recentConditions,
    recentRuns,
    rulesets,
    environments,
    modifiers,
  };
}
