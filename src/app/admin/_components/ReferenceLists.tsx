import type { LoadedAdminData } from "../_data/loadAdminData";
import styles from "../page.module.css";

export function ReferenceLists({ data }: { data: LoadedAdminData }) {
  return (
    <div className={styles.columns}>
      <section className={styles.section}>
        <h2>Rulesets</h2>
        <div className={styles.compactList}>
          {data.rulesets.map((ruleset) => (
            <p key={ruleset.id}>
              <strong>{ruleset.slug}</strong>
              <span>{ruleset.name}</span>
            </p>
          ))}
        </div>
      </section>
      <section className={styles.section}>
        <h2>Environments</h2>
        <div className={styles.compactList}>
          {data.environments.map((environment) => (
            <p key={environment.id}>
              <strong>{environment.slug}</strong>
              <span>{environment.kind}</span>
            </p>
          ))}
        </div>
      </section>
      <section className={styles.section}>
        <h2>Modifiers</h2>
        <div className={styles.compactList}>
          {data.modifiers.map((modifier) => (
            <p key={modifier.id}>
              <strong>{modifier.key}</strong>
              <span>{modifier.category}</span>
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
