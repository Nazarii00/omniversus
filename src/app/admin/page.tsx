import {
  AdminDisabled,
  AdminHeader,
  AdminShell,
  CharacterImportConsole,
  DossierForms,
  ImportApprovalQueue,
  Metrics,
  MissingDatabase,
  RecentFacts,
  RecentRuns,
  ReferenceLists,
  SubjectTable,
} from "@/features/admin/components";
import {
  hasAdminDatabase,
  isAdminEnabled,
  loadAdminData,
  type LoadedAdminData,
} from "@/features/admin/data";
import styles from "@/features/admin/styles/AdminPanel.module.css";
import { getPrismaWithRetry } from "@/server/db/prisma";
import { ReviewStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AdminPageSearchParams = Record<string, string | string[] | undefined>;

type AdminPageProps = {
  searchParams?: Promise<AdminPageSearchParams>;
};

type AdminPageResult =
  | { kind: "disabled" }
  | { kind: "no-database" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      data: LoadedAdminData;
      importQueue: {
        id: string;
        suggestedSubjectSlug: string;
        suggestedVersionSlug: string | null;
        status: string;
        createdAt: string;
      }[];
      selectedVersion: LoadedAdminData["versions"][number] | null;
      isAddingSubject: boolean;
      subjectQuery: string;
    };

async function resolveAdminPage(
  params: AdminPageSearchParams,
): Promise<AdminPageResult> {
  if (!isAdminEnabled()) return { kind: "disabled" };
  if (!hasAdminDatabase()) return { kind: "no-database" };

  try {
    const subjectPage = readPage(params.subjectsPage);
    const subjectQuery = readStringParam(params.subjectsQuery)?.trim() ?? "";
    const editVersionId = readStringParam(params.editVersionId);
    const mode = readStringParam(params.mode);
    const isAddingSubject = mode === "add";

    const data = await loadAdminData({ subjectPage, subjectQuery });
    if (!data) return { kind: "no-database" };

    const selectedVersion = isAddingSubject
      ? null
      : (data.versions.find((version) => version.id === editVersionId) ?? null);

    const prisma = await getPrismaWithRetry();
    const pendingImports = prisma
      ? await prisma.characterImportSuggestion.findMany({
          where: { status: ReviewStatus.REQUIRES_REVIEW },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            subjectSlug: true,
            versionSlug: true,
            status: true,
            createdAt: true,
          },
        })
      : [];

    const importQueue = pendingImports.map((i) => ({
      id: i.id,
      suggestedSubjectSlug: i.subjectSlug,
      suggestedVersionSlug: i.versionSlug,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
    }));

    return {
      kind: "ok",
      data,
      importQueue,
      selectedVersion,
      isAddingSubject,
      subjectQuery,
    };
  } catch (error) {
    return {
      kind: "error",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = (await searchParams) ?? {};
  const result = await resolveAdminPage(params);

  if (result.kind === "disabled") return <AdminDisabled />;
  if (result.kind === "no-database") return <MissingDatabase />;
  if (result.kind === "error") return <AdminError message={result.message} />;

  const { data, importQueue, selectedVersion, isAddingSubject, subjectQuery } =
    result;

  const showProfileWorkflow = isAddingSubject || Boolean(selectedVersion);

  return (
    <AdminShell>
      <AdminHeader />
      <Metrics data={data} />

      <section className={styles.section} id="subjects">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Dossiers</p>
          <h2>Subjects and versions</h2>
        </div>
        <SubjectTable
          data={data}
          selectedVersionId={selectedVersion?.id}
          subjectQuery={subjectQuery}
        />
      </section>

      {showProfileWorkflow ? (
        <DossierForms
          isAddingSubject={isAddingSubject}
          selectedVersion={selectedVersion}
          versions={data.versions}
        />
      ) : null}

      <section id="references">
        <ReferenceLists data={data} />
      </section>

      <section id="import">
        <CharacterImportConsole />
      </section>

      <section id="import-queue">
        <ImportApprovalQueue items={importQueue} />
      </section>

      <RecentFacts data={data} />
      <RecentRuns runs={data.recentRuns} />
    </AdminShell>
  );
}

function AdminError({ message }: { message: string }) {
  return (
    <main className={styles.page}>
      <section className={styles.notice}>
        <p className={styles.eyebrow}>Admin</p>
        <h1>Something went wrong</h1>
        <p>
          The admin panel could not be loaded. The database may be temporarily
          unavailable.
        </p>
        <pre
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "rgba(239, 68, 68, 0.1)",
            borderRadius: "6px",
            fontSize: "0.8rem",
            color: "#fca5a5",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message}
        </pre>
        <div style={{ marginTop: "1.5rem" }}>
          <a href="/admin" className={styles.secondaryButton}>
            Retry
          </a>
        </div>
      </section>
    </main>
  );
}

function readStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readPage(value: string | string[] | undefined) {
  const raw = readStringParam(value);
  const page = Number(raw);

  return Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1;
}
