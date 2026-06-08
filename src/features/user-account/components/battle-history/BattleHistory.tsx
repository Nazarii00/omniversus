"use client";

import { useMemo, useState } from "react";
import type { Battle, BattleResult, MonthGroup, FilterState } from "./types";
import ArchiveFilters from "./ArchiveFilters";
import styles from "./BattleHistory.module.css";

/* ================================================================
   RESULT CLASS MAP
   ================================================================ */

const RESULT_CLASS: Record<BattleResult, string> = {
  win: styles.win,
  loss: styles.loss,
  draw: styles.draw,
};

/* ================================================================
   HELPERS
   ================================================================ */

const MONTH_NAMES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

function deriveMonthGroups(battles: Battle[]): MonthGroup[] {
  const groups: Record<string, Battle[]> = {};

  for (const battle of battles) {
    const parts = battle.date.includes(".")
      ? battle.date.split(".")
      : battle.date.split("-");
    let month: number;
    let year: string;

    if (battle.date.includes(".")) {
      month = Number(parts[1]);
      year = parts[2];
    } else {
      month = Number(parts[1]);
      year = parts[0];
    }

    const monthIndex = month - 1;
    const label = `${MONTH_NAMES[monthIndex]} ${year}`;

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(battle);
  }

  return Object.entries(groups).map(([label, items]) => ({
    label,
    count: items.length,
    battles: items,
  }));
}

function computeWinRate(battles: Battle[]): number {
  if (battles.length === 0) return 0;
  const wins = battles.filter((b) => b.result === "win").length;
  return Math.round((wins / battles.length) * 100);
}

function computeStreak(battles: Battle[]): number {
  let streak = 0;
  for (const b of battles) {
    if (b.result === "win") {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function applyFilters(battles: Battle[], filters: FilterState): Battle[] {
  let filtered = battles;

  // Filter by result
  if (filters.result !== "all") {
    filtered = filtered.filter((b) => b.result === filters.result);
  }

  // Filter by search
  if (filters.search.trim()) {
    const query = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (b) =>
        b.fighterA.toLowerCase().includes(query) ||
        b.fighterB.toLowerCase().includes(query),
    );
  }

  // Sort
  if (filters.sort === "oldest") {
    filtered = [...filtered].reverse();
  }
  // "newest" is default order (already sorted by date desc from DB)

  return filtered;
}

/* ================================================================
   COMPONENT
   ================================================================ */

interface BattleHistoryProps {
  battles?: Battle[];
}

export default function BattleHistory({ battles = [] }: BattleHistoryProps) {
  const [filters, setFilters] = useState<FilterState>({
    result: "all",
    search: "",
    sort: "newest",
  });

  const filteredBattles = useMemo(
    () => applyFilters(battles, filters),
    [battles, filters],
  );

  const monthGroups = useMemo(
    () => deriveMonthGroups(filteredBattles),
    [filteredBattles],
  );

  const totalBattles = filteredBattles.length;
  const winRate = useMemo(
    () => computeWinRate(filteredBattles),
    [filteredBattles],
  );
  const streak = useMemo(
    () => computeStreak(filteredBattles),
    [filteredBattles],
  );

  return (
    <div className={styles.archive}>
      {/* FILTERS */}
      <ArchiveFilters filters={filters} onChange={setFilters} />

      {/* MONTH GROUPS */}
      {monthGroups.length === 0 && (
        <p className={styles.emptyState}>
          {battles.length === 0
            ? "No battles recorded yet."
            : "No battles match your filters."}
        </p>
      )}

      {monthGroups.map((month) => (
        <section className={styles.month} key={month.label}>
          <p className={styles.monthLabel}>
            {"// "}
            <span className={styles.monthLabelAccent}>{month.label}</span>
            {" · "}
            {month.count}
            {" RECORDED"}
          </p>

          <div className={styles.row}>
            {month.battles.map((battle) => (
              <div className={styles.scene} key={battle.id}>
                <div
                  className={`${styles.cassette} ${RESULT_CLASS[battle.result]}`}
                >
                  {/* --- FRONT FACE --- */}
                  <div className={`${styles.face} ${styles.front}`}>
                    <div className={styles.topStrip} />
                    <div className={styles.dot} />

                    {/* Battle number badge */}
                    <div className={styles.battleNumberBadge}>
                      #{battle.battleNumber}
                    </div>

                    {/* Reel area */}
                    <div className={styles.reelArea}>
                      <div className={styles.reel} />
                      <div className={styles.reel} />
                      <div className={styles.tapeGuide} />
                    </div>

                    {/* Label sticker */}
                    <div className={styles.labelSticker}>
                      <span className={styles.labelMode}>{battle.mode}</span>
                      <span className={styles.labelVs}>
                        {battle.fighterA} vs {battle.fighterB}
                      </span>
                      <span className={styles.labelMeta}>
                        {battle.date}
                        {battle.wager != null &&
                          ` · ${battle.wager >= 0 ? "+" : ""}${battle.wager} cr`}
                      </span>
                      <div className={styles.labelBar} />
                    </div>

                    {/* Scanlines overlay */}
                    <div className={styles.scanlines} />
                  </div>

                  {/* --- SIDE FACE --- */}
                  <div className={`${styles.face} ${styles.side}`} />

                  {/* --- TOP FACE --- */}
                  <div className={`${styles.face} ${styles.top}`} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* FOOTER STATS */}
      <footer className={styles.footer}>
        WIN_RATE <span className={styles.footerAccent}>{winRate}%</span>
        {" · "}TOTAL <span className={styles.footerAccent}>{totalBattles}</span>
        {" · "}STREAK <span className={styles.footerAccent}>x{streak}</span>
      </footer>
    </div>
  );
}
