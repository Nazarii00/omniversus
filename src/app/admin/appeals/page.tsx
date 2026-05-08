import Link from "next/link";

import { AdminDisabled, MissingDatabase } from "../_components/AdminNotice";
import { AdminShell } from "../_components/AdminShell";
import { AppealsReview } from "../_components/AppealsReview";
import {
  hasAppealsDatabase,
  loadAppealsData,
} from "../_data/loadAppealsData";
import { isAdminEnabled } from "../_data/loadAdminData";
import styles from "../page.module.css";

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
