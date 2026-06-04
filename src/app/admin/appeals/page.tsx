import Link from "next/link";

import {
  AdminDisabled,
  AdminShell,
  AppealsReview,
  MissingDatabase,
} from "@/features/admin/components";
import {
  hasAppealsDatabase,
  isAdminEnabled,
  loadAppealsData,
} from "@/features/admin/data";
import styles from "@/features/admin/styles/AdminPanel.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminAppealsPage() {
  if (!isAdminEnabled()) return <AdminDisabled />;
  if (!hasAppealsDatabase()) return <MissingDatabase />;

  const data = await loadAppealsData();
  if (!data) return <MissingDatabase />;

  return (
    <AdminShell>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Admin Console</p>
          <h1>User appeals</h1>
        </div>
        <Link className={styles.secondaryButton} href="/admin">
          Back to database
        </Link>
      </header>

      <AppealsReview data={data} />
    </AdminShell>
  );
}
