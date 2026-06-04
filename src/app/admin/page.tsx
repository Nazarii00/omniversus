import {
  AdminDisabled,
  AdminHeader,
  AdminShell,
  DossierForms,
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
} from "@/features/admin/data";
import styles from "@/features/admin/styles/AdminPanel.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminPageSearchParams = Record<string, string | string[] | undefined>;

type AdminPageProps = {
  searchParams?: Promise<AdminPageSearchParams>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  if (!isAdminEnabled()) return <AdminDisabled />;
  if (!hasAdminDatabase()) return <MissingDatabase />;

  const params = (await searchParams) ?? {};
  const subjectPage = readPage(params.subjectsPage);
  const subjectQuery = readStringParam(params.subjectsQuery)?.trim() ?? "";
  const editVersionId = readStringParam(params.editVersionId);
  const mode = readStringParam(params.mode);
  const isAddingSubject = mode === "add";
  const data = await loadAdminData({ subjectPage, subjectQuery });
  if (!data) return <MissingDatabase />;

  const selectedVersion =
    isAddingSubject
      ? null
      : data.versions.find((version) => version.id === editVersionId) ?? null;
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

      <RecentFacts data={data} />
      <RecentRuns data={data} />
    </AdminShell>
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
