import type { LoadedAdminData } from "../data/loadAdminData";
import { EmptyState } from "./FormControls";
import styles from "../styles/AdminPanel.module.css";

export function RecentFacts({ data }: { data: LoadedAdminData }) {
  return (
    <div className={styles.columns}>
      <section className={styles.section}>
        <h2>Capabilities</h2>
        <div className={styles.feed}>
          {data.recentCapabilities.map((fact) => (
            <article key={fact.id} className={styles.feedItem}>
              <span>
                {fact.version.subject.displayName} / {fact.category}
              </span>
              <p>{fact.valueText}</p>
            </article>
          ))}
          {!data.recentCapabilities.length && (
            <EmptyState>No capabilities yet.</EmptyState>
          )}
        </div>
      </section>
      <section className={styles.section}>
        <h2>Abilities</h2>
        <div className={styles.feed}>
          {data.recentAbilities.map((ability) => (
            <article key={ability.id} className={styles.feedItem}>
              <span>
                {ability.version.subject.displayName} / {ability.type}
              </span>
              <p>{ability.name}</p>
            </article>
          ))}
          {!data.recentAbilities.length && (
            <EmptyState>No abilities yet.</EmptyState>
          )}
        </div>
      </section>
      <section className={styles.section}>
        <h2>Win/Loss</h2>
        <div className={styles.feed}>
          {data.recentConditions.map((condition) => (
            <article key={condition.id} className={styles.feedItem}>
              <span>
                {condition.version.subject.displayName} / {condition.kind}
              </span>
              <p>{condition.method}</p>
            </article>
          ))}
          {!data.recentConditions.length && (
            <EmptyState>No conditions yet.</EmptyState>
          )}
        </div>
      </section>
    </div>
  );
}
