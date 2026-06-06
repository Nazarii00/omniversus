import Link from "next/link";
import styles from "./page.module.css";

export default function SubjectComparisonDocument() {
  return (
    <main className={styles.page}>
      <section className={styles.document}>
        <span className={styles.eyebrow}>Document 01</span>
        <h1 className={styles.title}>Subject comparison index</h1>
        <p className={styles.summary}>
          Dedicated subject comparison document.
        </p>
        <Link
          className={styles.backLink}
          href="/battle-report"
        >
          Back to battle report
        </Link>
      </section>
    </main>
  );
}
