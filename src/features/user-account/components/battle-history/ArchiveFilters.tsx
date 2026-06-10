"use client";

import type { BattleResult, FilterState } from "./types";
import styles from "./BattleHistory.module.css";

interface ArchiveFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const RESULT_OPTIONS: { value: FilterState["result"]; label: string }[] = [
  { value: "all", label: "ALL" },
  { value: "win", label: "WIN" },
  { value: "loss", label: "LOSS" },
  { value: "draw", label: "DRAW" },
];

const SORT_OPTIONS: { value: FilterState["sort"]; label: string }[] = [
  { value: "newest", label: "NEWEST" },
  { value: "oldest", label: "OLDEST" },
];

export default function ArchiveFilters({
  filters,
  onChange,
}: ArchiveFiltersProps) {
  function setResult(result: FilterState["result"]) {
    onChange({ ...filters, result });
  }

  function setSort(sort: FilterState["sort"]) {
    onChange({ ...filters, sort });
  }

  function setSearch(search: string) {
    onChange({ ...filters, search });
  }

  return (
    <div className={styles.filterBar}>
      {/* RESULT TOGGLES */}
      <div className={styles.filterGroup}>
        {RESULT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.filterBtn} ${filters.result === opt.value ? styles.filterBtnActive : ""}`}
            onClick={() => setResult(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* SEARCH INPUT */}
      <div className={styles.filterGroup}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search opponent..."
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* SORT TOGGLES */}
      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>SORT:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.filterBtn} ${filters.sort === opt.value ? styles.filterBtnActive : ""}`}
            onClick={() => setSort(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
