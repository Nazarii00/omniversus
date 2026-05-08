import Link from "next/link";

import styles from "../page.module.css";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/">
          Omniversus
        </Link>
        <nav>
          <a href="#overview">Overview</a>
          <a href="#subjects">Subjects</a>
          <a href="#subject-version">Subject form</a>
          <a href="#capability">Capability</a>
          <a href="#ability">Ability</a>
          <a href="#condition">Win/Loss</a>
          <a href="#references">References</a>
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
