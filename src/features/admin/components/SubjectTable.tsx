import type { LoadedAdminData } from "../data/loadAdminData";
import { EmptyState } from "./FormControls";
import styles from "../styles/AdminPanel.module.css";

export function SubjectTable({ data }: { data: LoadedAdminData }) {
  if (!data.subjects.length) {
    return <EmptyState>No subjects yet.</EmptyState>;
  }

  return (
    <div className={styles.tableShell}>
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Kind</th>
            <th>Versions</th>
            <th>Facts</th>
            <th>Aliases</th>
          </tr>
        </thead>
        <tbody>
          {data.subjects.map((subject) => (
            <tr key={subject.id}>
              <td>
                <strong>{subject.displayName}</strong>
                <span>{subject.slug}</span>
              </td>
              <td>{subject.kind}</td>
              <td>
                {subject.versions.map((version) => (
                  <p key={version.id} className={styles.stackLine}>
                    {version.isDefault ? "Default" : "Version"}: {version.label}
                  </p>
                ))}
              </td>
              <td>
                {subject.versions.map((version) => {
                  const total =
                    version._count.capabilities +
                    version._count.abilities +
                    version._count.resistances +
                    version._count.equipment +
                    version._count.weaknesses +
                    version._count.conditions +
                    version._count.feats;

                  return (
                    <p key={version.id} className={styles.stackLine}>
                      {version.label}: {total}
                    </p>
                  );
                })}
              </td>
              <td>{subject.aliases.map((alias) => alias.value).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
