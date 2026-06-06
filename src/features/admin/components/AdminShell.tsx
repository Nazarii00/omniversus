import Link from "next/link";

import styles from "../styles/AdminPanel.module.css";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/">
          Omniversus
        </Link>
        <nav>
          <a href="/admin#overview">Overview</a>
          <a href="/admin#subjects">Subjects</a>
          <Link href="/admin?mode=add#profile-workflow">Profile builder</Link>
          <a href="/admin#references">References</a>
          <Link href="/admin/appeals">Appeals</Link>
        </nav>
      </aside>

      <div className={styles.content}>{children}</div>
    </main>
  );
}

export function AdminHeader() {
  return (
    <header className={styles.header} id="overview">
      <div>
        <p className={styles.eyebrow}>Admin Console</p>
        <h1>Battle database</h1>
      </div>
      <Link className={styles.secondaryButton} href="/">
        Back to app
      </Link>
    </header>
  );
}
