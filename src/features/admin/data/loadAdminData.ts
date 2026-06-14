import pLimit from "p-limit";
import { getPrismaWithRetry, hasDatabaseUrl } from "@/server/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type AdminData = Awaited<ReturnType<typeof loadAdminData>>;
export type LoadedAdminData = NonNullable<AdminData>;

export type VersionOption = LoadedAdminData["versions"][number];

const DEFAULT_SUBJECT_PAGE = 1;
const DEFAULT_SUBJECT_PAGE_SIZE = 10;

// Limit concurrent DB queries to avoid exhausting the connection pool.
// PgBouncer (Supabase pooler, port 6543) handles global pooling,
// but we still want to avoid 19 parallel heavy queries in a single function.
const DB_CONCURRENCY_LIMIT = 4;

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

// ─── Wave helpers ──────────────────────────────────────────────────

type Fallback<T> = { data: T; error: null } | { data: null; error: unknown };

async function withFallback<T>(promise: Promise<T>): Promise<Fallback<T>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ─── Main loader ───────────────────────────────────────────────────

export async function loadAdminData(options: LoadAdminDataOptions = {}) {
  const prisma = await getPrismaWithRetry();

  if (!prisma) return null;

  const subjectWhere = buildSubjectWhere(options.subjectQuery);
  const limit = pLimit(DB_CONCURRENCY_LIMIT);

  // ── Wave 1: Critical (blocking) — subjects + versions ────────────

  const [totalSubjectCount, subjectCount] = await Promise.all([
    prisma.subject.count(),
    prisma.subject.count({ where: subjectWhere }),
  ]);

  const subjectPageSize = normalizePageSize(options.subjectPageSize);
  const subjectPage = normalizePage(
    options.subjectPage,
    Math.ceil(subjectCount / subjectPageSize),
  );
  const subjectSkip = (subjectPage - 1) * subjectPageSize;

  const [subjects, versions] = await Promise.all([
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
  ]);

  // ── Wave 2: Secondary counts (light queries, bounded concurrency) ─

  const [
    versionCountResult,
    capabilityCountResult,
    abilityCountResult,
    evidenceSourceCountResult,
    evidenceLinkCountResult,
    battleRunCountResult,
  ] = await Promise.all([
    withFallback(limit(() => prisma.subjectVersion.count())),
    withFallback(limit(() => prisma.capabilityAssertion.count())),
    withFallback(limit(() => prisma.ability.count())),
    withFallback(limit(() => prisma.evidenceSource.count())),
    withFallback(limit(() => prisma.evidenceLink.count())),
    withFallback(limit(() => prisma.battleRun.count())),
  ]);

  const versionCount = versionCountResult.data ?? 0;
  const capabilityCount = capabilityCountResult.data ?? 0;
  const abilityCount = abilityCountResult.data ?? 0;
  const evidenceSourceCount = evidenceSourceCountResult.data ?? 0;
  const evidenceLinkCount = evidenceLinkCountResult.data ?? 0;
  const battleRunCount = battleRunCountResult.data ?? 0;

  // ── Wave 3: Non-critical (can fail without breaking the page) ─────

  const [
    recentCapabilitiesResult,
    recentAbilitiesResult,
    recentConditionsResult,
    recentRunsResult,
    rulesetsResult,
    environmentsResult,
    modifiersResult,
  ] = await Promise.all([
    withFallback(
      limit(() =>
        prisma.capabilityAssertion.findMany({
          take: 10,
          orderBy: [{ updatedAt: "desc" }],
          include: {
            version: {
              include: { subject: true },
            },
          },
        }),
      ),
    ),
    withFallback(
      limit(() =>
        prisma.ability.findMany({
          take: 10,
          orderBy: [{ updatedAt: "desc" }],
          include: {
            version: {
              include: { subject: true },
            },
          },
        }),
      ),
    ),
    withFallback(
      limit(() =>
        prisma.winLossCondition.findMany({
          take: 10,
          orderBy: [{ updatedAt: "desc" }],
          include: {
            version: {
              include: { subject: true },
            },
          },
        }),
      ),
    ),
    withFallback(
      limit(() =>
        prisma.battleRun.findMany({
          take: 8,
          orderBy: [{ createdAt: "desc" }],
        }),
      ),
    ),
    withFallback(
      limit(() =>
        prisma.battleRuleset.findMany({
          orderBy: { slug: "asc" },
        }),
      ),
    ),
    withFallback(
      limit(() =>
        prisma.battleEnvironment.findMany({
          orderBy: { slug: "asc" },
        }),
      ),
    ),
    withFallback(
      limit(() =>
        prisma.modifier.findMany({
          orderBy: [{ category: "asc" }, { key: "asc" }],
        }),
      ),
    ),
  ]);

  const recentCapabilities = recentCapabilitiesResult.data ?? [];
  const recentAbilities = recentAbilitiesResult.data ?? [];
  const recentConditions = recentConditionsResult.data ?? [];
  const recentRuns = recentRunsResult.data ?? [];
  const rulesets = rulesetsResult.data ?? [];
  const environments = environmentsResult.data ?? [];
  const modifiers = modifiersResult.data ?? [];

  // Log any non-critical failures for observability
  const waveErrors = [
    { name: "recentCapabilities", result: recentCapabilitiesResult },
    { name: "recentAbilities", result: recentAbilitiesResult },
    { name: "recentConditions", result: recentConditionsResult },
    { name: "recentRuns", result: recentRunsResult },
    { name: "rulesets", result: rulesetsResult },
    { name: "environments", result: environmentsResult },
    { name: "modifiers", result: modifiersResult },
  ]
    .filter((r) => r.result.error)
    .map(
      (r) =>
        `[admin] Non-critical data "${r.name}" failed: ${String(r.result.error)}`,
    );

  if (waveErrors.length) {
    console.warn(waveErrors.join("\n"));
  }

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

// ─── Helpers ────────────────────────────────────────────────────────

function buildSubjectWhere(
  query: string | undefined,
): Prisma.SubjectWhereInput {
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
  const page = Number.isFinite(value)
    ? Math.trunc(value ?? 1)
    : DEFAULT_SUBJECT_PAGE;
  const maxPage = Math.max(DEFAULT_SUBJECT_PAGE, totalPages);

  return Math.max(DEFAULT_SUBJECT_PAGE, Math.min(page, maxPage));
}

function normalizePageSize(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_SUBJECT_PAGE_SIZE;

  return Math.max(
    5,
    Math.min(Math.trunc(value ?? DEFAULT_SUBJECT_PAGE_SIZE), 40),
  );
}
