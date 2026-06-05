"use client";

import { useMemo } from "react";
import type { Battle, MonthGroup } from "./types";
import styles from "./BattleHistory.module.css";

/* ================================================================
   RESULT CLASS MAP
   ================================================================ */

const RESULT_CLASS: Record<Battle["result"], string> = {
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
    const [day, month] = battle.date.split(".");
    const year = new Date().getFullYear().toString();
    const monthIndex = Number(month) - 1;
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

/* ================================================================
   COMPONENT
   ================================================================ */

interface BattleHistoryProps {
  battles?: Battle[];
}

export default function BattleHistory({ battles = [] }: BattleHistoryProps) {
  const monthGroups = useMemo(() => deriveMonthGroups(battles), [battles]);
  const totalBattles = battles.length;
  const winRate = useMemo(() => computeWinRate(battles), [battles]);
  const streak = useMemo(() => computeStreak(battles), [battles]);

  return (
    <div className={styles.archive}>
      {monthGroups.length === 0 && (
        <p className={styles.monthLabel}>No battles recorded yet.</p>
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
                    <div className={styles.frontBody} />

                    {/* Reel area */}
                    <div className={styles.reelArea}>
                      <div className={styles.reel} />
                      <div className={styles.reel} />
                      <div className={styles.tapeGuide} />
                    </div>

                    {/* Label sticker */}
                    <div className={styles.labelSticker}>
                      <span className={styles.labelVs}>
                        vs {battle.opponent}
                      </span>
                      <span className={styles.labelMeta}>
                        {battle.date} · {battle.score}
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
