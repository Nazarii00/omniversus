import Link from "next/link";
import type { BattlesHistoryItem } from "../model/types";
import styles from "../styles/account.module.css";

interface BattlesHistoryListProps {
  battles: BattlesHistoryItem[];
  showViewAll?: boolean;
}

function statusClass(status: string): string {
  const key = `status${status.charAt(0).toUpperCase() + status.slice(1)}` as
    | "statusCompleted"
    | "statusPending"
    | "statusFailed";

  return styles[key] ?? styles.statusPending;
}

function formatDate(value: Date | string | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function BattlesHistoryList({
  battles,
  showViewAll,
}: BattlesHistoryListProps) {
  if (!battles.length) {
    return (
      <div className={styles.emptyState}>
        No battles fought yet. Head to the arena to start one.
      </div>
    );
  }

  return (
    <>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Recent battles</h2>
        {showViewAll ? (
          <Link className={styles.battlesLink} href="/account/battles">
            View all
          </Link>
        ) : null}
      </div>

      {battles.map((battle) => (
        <div className={styles.battleItem} key={battle.id}>
          <div className={styles.fighters}>
            <span className={styles.fighterName}>{battle.fighterA}</span>
            <span className={styles.vs}>vs</span>
            <span className={styles.fighterName}>{battle.fighterB}</span>
          </div>
          <div className={styles.battleMeta}>
            <span
              className={`${styles.statusBadge} ${statusClass(battle.status.toLowerCase())}`}
            >
              {battle.status}
            </span>
            <span>{formatDate(battle.completedAt ?? battle.createdAt)}</span>
          </div>
        </div>
      ))}
    </>
  );
}
