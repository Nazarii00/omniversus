import styles from "./page.module.css";

const LOCKED_SLOTS = Array.from({ length: 6 }, (_, i) => i);

export default function CommendationsPage() {
  return (
    <div className={styles.commendations}>
      <h1 className={styles.pageTitle}>COMMENDATIONS</h1>

      <p className={styles.commendationsEmpty}>
        NO COMMENDATIONS ON RECORD &middot; KEEP FIGHTING
      </p>

      <div className={styles.commendationsGrid}>
        {LOCKED_SLOTS.map((slot) => (
          <div className={styles.lockedBadge} key={slot}>
            <span className={styles.lockedBadgeIcon}>&#9637;</span>
            <span className={styles.lockedBadgeLabel}>--LOCKED--</span>
          </div>
        ))}
      </div>
    </div>
  );
}
