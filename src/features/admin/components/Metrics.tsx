import type { LoadedAdminData } from "../data/loadAdminData";
import styles from "../styles/AdminPanel.module.css";

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value.toLocaleString("en-US")}</strong>
    </div>
  );
}

export function Metrics({ data }: { data: LoadedAdminData }) {
  return (
    <section className={styles.metrics}>
      <Metric label="Subjects" value={data.counts.subjects} />
      <Metric label="Versions" value={data.counts.versions} />
      <Metric label="Capabilities" value={data.counts.capabilities} />
      <Metric label="Abilities" value={data.counts.abilities} />
      <Metric label="Sources" value={data.counts.evidenceSources} />
      <Metric label="Evidence links" value={data.counts.evidenceLinks} />
      <Metric label="Runs" value={data.counts.battleRuns} />
    </section>
  );
}
