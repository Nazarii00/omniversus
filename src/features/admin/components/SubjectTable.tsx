import Link from "next/link";

import type { LoadedAdminData } from "../data/loadAdminData";
import { EmptyState } from "./FormControls";
import styles from "../styles/AdminPanel.module.css";

export function SubjectTable({
  data,
  selectedVersionId,
  subjectQuery,
}: {
  data: LoadedAdminData;
  selectedVersionId?: string;
  subjectQuery?: string;
}) {
  const pagination = data.subjectPagination;

  return (
    <div className={styles.subjectTableStack}>
      <div className={styles.subjectToolbar}>
        <form action="/admin" className={styles.subjectSearch} method="get">
          <input
            aria-label="Search subjects"
            defaultValue={subjectQuery}
            name="subjectsQuery"
            placeholder="Search subjects, aliases, origins..."
            type="search"
          />
          <button className={styles.secondaryButton} type="submit">
            Search
          </button>
          {subjectQuery ? (
            <Link className={styles.secondaryButton} href="/admin#subjects">
              Clear
            </Link>
          ) : null}
        </form>
        <Link className={styles.submitButton} href={addHref(subjectQuery)}>
          Add new character
        </Link>
      </div>

      {data.subjects.length ? (
        <div className={styles.tableShell}>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Kind</th>
                <th>Versions</th>
                <th>Facts</th>
                <th>Aliases</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {data.subjects.map((subject) => {
                const primaryVersion =
                  subject.versions.find((version) => version.isDefault) ??
                  subject.versions[0] ??
                  null;
                const isSelected = subject.versions.some(
                  (version) => version.id === selectedVersionId,
                );

                return (
                  <tr key={subject.id} data-selected={isSelected}>
                    <td>
                      {primaryVersion ? (
                        <Link
                          className={styles.subjectEditLink}
                          href={editHref(
                            pagination.page,
                            primaryVersion.id,
                            subjectQuery,
                          )}
                        >
                          <strong>{subject.displayName}</strong>
                          <span>{subject.slug}</span>
                        </Link>
                      ) : (
                        <>
                          <strong>{subject.displayName}</strong>
                          <span>{subject.slug}</span>
                        </>
                      )}
                    </td>
                    <td>{subject.kind}</td>
                    <td>
                      {subject.versions.map((version) => (
                        <Link
                          key={version.id}
                          className={styles.stackLink}
                          href={editHref(
                            pagination.page,
                            version.id,
                            subjectQuery,
                          )}
                        >
                          {version.isDefault ? "Default" : "Version"}:{" "}
                          {version.label}
                        </Link>
                      ))}
                    </td>
                    <td>
                      {subject.versions.map((version) => (
                        <p key={version.id} className={styles.stackLine}>
                          {version.label}: {factCount(version)}
                        </p>
                      ))}
                    </td>
                    <td>
                      {subject.aliases.map((alias) => alias.value).join(", ")}
                    </td>
                    <td>
                      {primaryVersion ? (
                        <Link
                          className={styles.tableActionLink}
                          href={editHref(
                            pagination.page,
                            primaryVersion.id,
                            subjectQuery,
                          )}
                        >
                          Edit
                        </Link>
                      ) : (
                        <span className={styles.empty}>No version</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>
          {subjectQuery
            ? `No subjects found for "${subjectQuery}".`
            : "No subjects yet."}
        </EmptyState>
      )}

      <nav className={styles.pagination} aria-label="Subject pagination">
        {pagination.page > 1 ? (
          <Link
            href={pageHref(
              pagination.page - 1,
              selectedVersionId,
              subjectQuery,
            )}
          >
            Previous
          </Link>
        ) : (
          <span>Previous</span>
        )}
        <strong>
          Page {pagination.page} / {pagination.totalPages}
        </strong>
        {pagination.page < pagination.totalPages ? (
          <Link
            href={pageHref(
              pagination.page + 1,
              selectedVersionId,
              subjectQuery,
            )}
          >
            Next
          </Link>
        ) : (
          <span>Next</span>
        )}
      </nav>
    </div>
  );
}

function addHref(subjectQuery: string | undefined) {
  const params = new URLSearchParams({ mode: "add" });

  if (subjectQuery) params.set("subjectsQuery", subjectQuery);

  return `/admin?${params.toString()}#profile-workflow`;
}

function editHref(
  subjectsPage: number,
  editVersionId: string,
  subjectQuery: string | undefined,
) {
  const params = new URLSearchParams({
    editVersionId,
    subjectsPage: String(subjectsPage),
  });

  if (subjectQuery) params.set("subjectsQuery", subjectQuery);

  return `/admin?${params.toString()}#profile-workflow`;
}

function pageHref(
  page: number,
  selectedVersionId: string | undefined,
  subjectQuery: string | undefined,
) {
  const params = new URLSearchParams({ subjectsPage: String(page) });

  if (selectedVersionId) params.set("editVersionId", selectedVersionId);
  if (subjectQuery) params.set("subjectsQuery", subjectQuery);

  return `/admin?${params.toString()}#subjects`;
}

function factCount(version: LoadedAdminData["subjects"][number]["versions"][number]) {
  return (
    version._count.capabilities +
    version._count.abilities +
    version._count.resistances +
    version._count.equipment +
    version._count.weaknesses +
    version._count.conditions +
    version._count.feats
  );
}
