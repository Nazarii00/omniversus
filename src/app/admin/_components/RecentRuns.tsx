import type { LoadedAdminData } from "../_data/loadAdminData";
import { EmptyState } from "./FormControls";
import styles from "../page.module.css";

export function RecentRuns({ data }: { data: LoadedAdminData }) {
  return (
    <section className={styles.section}>
      <h2>Recent battle runs</h2>
      {!data.recentRuns.length ? (
        <EmptyState>No battle runs captured yet.</EmptyState>
      ) : (
        <div className={styles.tableShell}>
          <table>
            <thead>
              <tr>
                <th>Matchup</th>
                <th>Status</th>
                <th>Model</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.recentRuns.map((run) => (
                <tr key={run.id}>
                  <td>
                    {run.fighterAName} vs {run.fighterBName}
                  </td>
                  <td>{run.status}</td>
                  <td>{run.resolvedModel ?? run.requestedModel ?? "None"}</td>
                  <td>{run.createdAt.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
