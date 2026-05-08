import styles from "../page.module.css";

export function AdminDisabled() {
  return (
    <main className={styles.page}>
      <section className={styles.notice}>
        <p className={styles.eyebrow}>Admin</p>
        <h1>Admin panel disabled</h1>
        <p>
          Set <code>ADMIN_PANEL_ENABLED=true</code> to expose this page in
          production. It remains available in development.
        </p>
      </section>
    </main>
  );
}

export function MissingDatabase() {
  return (
    <main className={styles.page}>
      <section className={styles.notice}>
        <p className={styles.eyebrow}>Database</p>
        <h1>Postgres URL is missing</h1>
        <p>
          Add <code>DIRECT_URL</code> or <code>DATABASE_URL</code> to{" "}
          <code>.env.local</code>, then restart the dev server.
        </p>
      </section>
    </main>
  );
}
