import type { BattleReportJson } from "./types";

const FULL_REPORT_STORAGE_KEY = "omniversus.latestBattleReport";
export const LATEST_BATTLE_REPORT_STORAGE_EVENT =
  "omniversus.latestBattleReportChanged";

function browserStorage(storageName: "localStorage" | "sessionStorage") {
  if (typeof window === "undefined") return null;

  try {
    return window[storageName];
  } catch {
    return null;
  }
}

function emitReportStorageChange() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(LATEST_BATTLE_REPORT_STORAGE_EVENT));
}

function readStorageValue(storage: Storage | null) {
  try {
    return storage?.getItem(FULL_REPORT_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeStorageValue(storage: Storage | null, value: string) {
  try {
    storage?.setItem(FULL_REPORT_STORAGE_KEY, value);
  } catch {
    // Storage can be blocked or full; the UI can still use in-memory state.
  }
}

function removeStorageValue(storage: Storage | null) {
  try {
    storage?.removeItem(FULL_REPORT_STORAGE_KEY);
  } catch {
    // Ignore blocked storage on cleanup as well.
  }
}

export function writeLatestBattleReport(report: BattleReportJson) {
  const serializedReport = JSON.stringify(report);
  const localStore = browserStorage("localStorage");
  const sessionStore = browserStorage("sessionStorage");

  writeStorageValue(localStore, serializedReport);
  writeStorageValue(sessionStore, serializedReport);
  emitReportStorageChange();
}

export function readLatestBattleReportText() {
  const localStore = browserStorage("localStorage");
  const sessionStore = browserStorage("sessionStorage");
  const localReport = readStorageValue(localStore);

  if (localReport) return localReport;

  const sessionReport = readStorageValue(sessionStore);

  if (sessionReport) {
    writeStorageValue(localStore, sessionReport);
  }

  return sessionReport;
}

export function clearLatestBattleReport() {
  removeStorageValue(browserStorage("localStorage"));
  removeStorageValue(browserStorage("sessionStorage"));
  emitReportStorageChange();
}

export function parseLatestBattleReport(storedReport: string | null) {
  if (!storedReport) return null;

  try {
    return JSON.parse(storedReport) as BattleReportJson;
  } catch {
    return null;
  }
}
