import { UserAppealKind } from "@/generated/prisma/enums";

import { resolveUserAppealAction } from "../_actions/userAppealActions";
import type { LoadedAppealsData } from "../_data/loadAppealsData";
import styles from "../page.module.css";
import { EmptyState } from "./FormControls";

type Appeal = LoadedAppealsData["pendingInfoAppeals"][number];

function formatDate(value: Date | null) {
  if (!value) return "Not reviewed";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function targetLabel(appeal: Appeal) {
  if (!appeal.targetVersion) return "No linked version";

  return `${appeal.targetVersion.subject.displayName} / ${appeal.targetVersion.label}`;
}

function createdEntityLabel(appeal: Appeal) {
  if (appeal.createdVersion) {
    return `${appeal.createdVersion.subject.displayName} / ${appeal.createdVersion.label}`;
  }

  if (appeal.createdSubject) return appeal.createdSubject.displayName;

  return "None";
}

function kindLabel(kind: UserAppealKind) {
  return kind === UserAppealKind.SUBJECT_REQUEST
    ? "Subject request"
    : "Information appeal";
}

function AppealDecisionForm({ appeal }: { appeal: Appeal }) {
  const approveLabel =
    appeal.kind === UserAppealKind.SUBJECT_REQUEST
      ? "Approve and create"
      : "Approve";

  return (
    <form action={resolveUserAppealAction} className={styles.appealForm}>
      <input name="appealId" type="hidden" value={appeal.id} />
      <label className={`${styles.field} ${styles.wide}`}>
        <span>Resolution note</span>
        <textarea
          name="resolutionNote"
          placeholder="Short internal note"
          rows={2}
        />
      </label>
      <div className={styles.appealActions}>
        <button
          className={styles.submitButton}
          name="decision"
          type="submit"
          value="approve"
        >
          {approveLabel}
        </button>
        <button
          className={`${styles.secondaryButton} ${styles.rejectButton}`}
          name="decision"
          type="submit"
          value="reject"
        >
          Reject
        </button>
      </div>
    </form>
  );
}

function AppealCard({ appeal }: { appeal: Appeal }) {
  return (
    <article className={styles.appealCard}>
      <div className={styles.appealCardHeader}>
        <div>
          <span className={styles.appealBadge}>{kindLabel(appeal.kind)}</span>
          <h3>{appeal.title ?? appeal.subjectName}</h3>
        </div>
        <span className={styles.appealDate}>{formatDate(appeal.createdAt)}</span>
      </div>

      <dl className={styles.appealMeta}>
        <div>
          <dt>Subject</dt>
          <dd>{appeal.subjectName}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd>{targetLabel(appeal)}</dd>
        </div>
        <div>
          <dt>Submitter</dt>
          <dd>{appeal.submitterName ?? appeal.submitterContact ?? "Unknown"}</dd>
        </div>
      </dl>

      <p className={styles.appealBody}>{appeal.body}</p>

      {appeal.proposedText ? (
        <p className={styles.appealProposal}>{appeal.proposedText}</p>
      ) : null}

      {appeal.sourceRef ? (
        <p className={styles.appealSource}>{appeal.sourceRef}</p>
      ) : null}

      <AppealDecisionForm appeal={appeal} />
    </article>
  );
}

function AppealColumn({
  title,
  appeals,
  emptyText,
}: {
  title: string;
  appeals: Appeal[];
  emptyText: string;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.eyebrow}>Queue</p>
        <h2>{title}</h2>
      </div>

      <div className={styles.appealStack}>
        {appeals.length ? (
          appeals.map((appeal) => <AppealCard appeal={appeal} key={appeal.id} />)
        ) : (
          <EmptyState>{emptyText}</EmptyState>
        )}
      </div>
    </section>
  );
}

export function AppealsReview({ data }: { data: LoadedAppealsData }) {
  return (
    <>
      <div className={styles.metrics}>
        <article className={styles.metric}>
          <span>Pending</span>
          <strong>{data.counts.pending}</strong>
        </article>
        <article className={styles.metric}>
          <span>Accepted</span>
          <strong>{data.counts.accepted}</strong>
        </article>
        <article className={styles.metric}>
          <span>Rejected</span>
          <strong>{data.counts.rejected}</strong>
        </article>
      </div>

      <div className={styles.appealColumns}>
        <AppealColumn
          appeals={data.pendingInfoAppeals}
          emptyText="No information appeals waiting for review."
          title="Information appeals"
        />
        <AppealColumn
          appeals={data.pendingSubjectRequests}
          emptyText="No subject creation requests waiting for review."
          title="Subject requests"
        />
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>History</p>
          <h2>Recently reviewed</h2>
        </div>

        <div className={styles.tableShell}>
          <table>
            <thead>
              <tr>
                <th>Appeal</th>
                <th>Status</th>
                <th>Target</th>
                <th>Created</th>
                <th>Reviewed</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {data.recentReviewedAppeals.map((appeal) => (
                <tr key={appeal.id}>
                  <td>
                    <strong>{appeal.subjectName}</strong>
                    <span>{kindLabel(appeal.kind)}</span>
                  </td>
                  <td>{appeal.status}</td>
                  <td>{targetLabel(appeal)}</td>
                  <td>{formatDate(appeal.createdAt)}</td>
                  <td>{formatDate(appeal.reviewedAt)}</td>
                  <td>{createdEntityLabel(appeal)}</td>
                </tr>
              ))}
              {data.recentReviewedAppeals.length === 0 ? (
                <tr>
                  <td colSpan={6}>No reviewed appeals yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
