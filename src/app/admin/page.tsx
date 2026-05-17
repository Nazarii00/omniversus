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

export default async function AdminPage() {
  if (!isAdminEnabled()) return <AdminDisabled />;
  if (!hasAdminDatabase()) return <MissingDatabase />;

  const data = await loadAdminData();
  if (!data) return <MissingDatabase />;

  return (
    <AdminShell>
      <AdminHeader />
      <Metrics data={data} />

      <section className={styles.section} id="subjects">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Dossiers</p>
          <h2>Subjects and versions</h2>
        </div>
        <SubjectTable data={data} />
      </section>

      <DossierForms versions={data.versions} />

      <section id="references">
        <ReferenceLists data={data} />
      </section>

      <RecentFacts data={data} />
      <RecentRuns data={data} />
    </AdminShell>
  );
}
