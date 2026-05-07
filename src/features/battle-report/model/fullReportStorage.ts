import type { BattleReportJson } from "./types";

const FULL_REPORT_STORAGE_KEY = "omniversus.latestBattleReport";

export function writeLatestBattleReport(report: BattleReportJson) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    FULL_REPORT_STORAGE_KEY,
    JSON.stringify(report),
  );
}

export function readLatestBattleReportText() {
  if (typeof window === "undefined") return null;

  return window.sessionStorage.getItem(FULL_REPORT_STORAGE_KEY);
}

export function parseLatestBattleReport(storedReport: string | null) {
  if (!storedReport) return null;

  try {
    return JSON.parse(storedReport) as BattleReportJson;
  } catch {
    return null;
  }
}
