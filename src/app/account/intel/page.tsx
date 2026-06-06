import styles from "./page.module.css";

export default function IntelPage() {
  return (
    <div className={styles.intel}>
      <h1 className={styles.pageTitle}>INTEL</h1>

      <p className={styles.intelEmpty}>
        INTEL REPORT PENDING &middot; INSUFFICIENT DATA
      </p>

      <div className={styles.intelPanels}>
        <div className={`${styles.panelPlaceholder} ${styles.panelLarge}`}>
          <span className={styles.panelLabel}>{"//"} CHART PLACEHOLDER</span>
        </div>
        <div className={styles.panelPlaceholder}>
          <span className={styles.panelLabel}>{"//"} CHART PLACEHOLDER</span>
        </div>
        <div className={styles.panelPlaceholder}>
          <span className={styles.panelLabel}>{"//"} CHART PLACEHOLDER</span>
        </div>
      </div>
    </div>
  );
}
