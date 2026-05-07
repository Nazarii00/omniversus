"use client";

import styles from "./FullBattleReportPage.module.css";

export function FactIssueButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.factIssueButton}
      data-active={active}
      aria-pressed={active}
      onClick={onToggle}
      title={active ? "Fact review requested" : "Request fact review"}
    >
      <span className={styles.factIssueIcon} aria-hidden="true">
        <i>!</i>
      </span>
      <span>{active ? "Review requested" : "Review fact"}</span>
    </button>
  );
}
