import { getPrisma, hasDatabaseUrl } from "@/server/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type AdminData = Awaited<ReturnType<typeof loadAdminData>>;
export type LoadedAdminData = NonNullable<AdminData>;

export type VersionOption = LoadedAdminData["versions"][number];

const DEFAULT_SUBJECT_PAGE = 1;
const DEFAULT_SUBJECT_PAGE_SIZE = 10;

type LoadAdminDataOptions = {
  subjectQuery?: string;
  subjectPage?: number;
  subjectPageSize?: number;
};

export function isAdminEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ADMIN_PANEL_ENABLED === "true"
  );
}

export function hasAdminDatabase(): boolean {
  return hasDatabaseUrl();
}

export async function loadAdminData(options: LoadAdminDataOptions = {}) {
  const prisma = getPrisma();

  if (!prisma) return null;

  const subjectWhere = buildSubjectWhere(options.subjectQuery);
  const totalSubjectCount = await prisma.subject.count();
  const subjectCount = await prisma.subject.count({ where: subjectWhere });
  const subjectPageSize = normalizePageSize(options.subjectPageSize);
  const subjectPage = normalizePage(
    options.subjectPage,
    Math.ceil(subjectCount / subjectPageSize),
  );
  const subjectSkip = (subjectPage - 1) * subjectPageSize;

  const [
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
    prisma.subjectVersion.count(),
    prisma.capabilityAssertion.count(),
    prisma.ability.count(),
    prisma.evidenceSource.count(),
    prisma.evidenceLink.count(),
    prisma.battleRun.count(),
    prisma.subject.findMany({
      where: subjectWhere,
      skip: subjectSkip,
      take: subjectPageSize,
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
        subject: {
          include: {
            aliases: {
              orderBy: { value: "asc" },
            },
          },
        },
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
      subjects: totalSubjectCount,
      versions: versionCount,
      capabilities: capabilityCount,
      abilities: abilityCount,
      evidenceSources: evidenceSourceCount,
      evidenceLinks: evidenceLinkCount,
      battleRuns: battleRunCount,
    },
    subjects,
    subjectPagination: {
      page: subjectPage,
      pageSize: subjectPageSize,
      query: normalizeSearch(options.subjectQuery),
      totalCount: subjectCount,
      totalPages: Math.max(1, Math.ceil(subjectCount / subjectPageSize)),
    },
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

function buildSubjectWhere(query: string | undefined): Prisma.SubjectWhereInput {
  const search = normalizeSearch(query);

  if (!search) return {};

  return {
    OR: [
      { displayName: { contains: search, mode: "insensitive" } },
      { canonicalName: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { originName: { contains: search, mode: "insensitive" } },
      {
        aliases: {
          some: { value: { contains: search, mode: "insensitive" } },
        },
      },
      {
        versions: {
          some: { label: { contains: search, mode: "insensitive" } },
        },
      },
    ],
  };
}

function normalizeSearch(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function normalizePage(value: number | undefined, totalPages: number) {
  const page = Number.isFinite(value) ? Math.trunc(value ?? 1) : DEFAULT_SUBJECT_PAGE;
  const maxPage = Math.max(DEFAULT_SUBJECT_PAGE, totalPages);

  return Math.max(DEFAULT_SUBJECT_PAGE, Math.min(page, maxPage));
}

function normalizePageSize(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_SUBJECT_PAGE_SIZE;

  return Math.max(5, Math.min(Math.trunc(value ?? DEFAULT_SUBJECT_PAGE_SIZE), 40));
}
