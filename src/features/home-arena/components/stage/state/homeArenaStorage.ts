import type { BattleReportJson } from "@/features/battle-report";

export type StoredHomeArenaState = {
  leftName?: string;
  rightName?: string;
  battleReport?: BattleReportJson | null;
  isReportReady?: boolean;
  reportSerial?: number;
};

const HOME_ARENA_STORAGE_KEY = "omniversus.homeArenaState";
const HOME_ARENA_STORAGE_EVENT = "omniversus.homeArenaStateChanged";

function homeArenaStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function emitHomeArenaStorageChange() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(HOME_ARENA_STORAGE_EVENT));
}

export function readStoredHomeArenaStateText() {
  let storedState: string | null = null;

  try {
    storedState = homeArenaStorage()?.getItem(HOME_ARENA_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }

  if (!storedState) return null;

  return storedState;
}

export function parseStoredHomeArenaState(storedState: string | null) {
  if (!storedState) return null;

  try {
    return JSON.parse(storedState) as StoredHomeArenaState;
  } catch {
    return null;
  }
}

export function writeStoredHomeArenaState(state: StoredHomeArenaState) {
  const storage = homeArenaStorage();
  if (!storage) return;

  const hasArenaState =
    Boolean(state.leftName || state.rightName || state.battleReport) ||
    Boolean(state.isReportReady);

  if (!hasArenaState) {
    try {
      if (!storage.getItem(HOME_ARENA_STORAGE_KEY)) return;

      storage.removeItem(HOME_ARENA_STORAGE_KEY);
      emitHomeArenaStorageChange();
    } catch {
      // Ignore blocked storage; the current React state remains usable.
    }
    return;
  }

  try {
    const nextStateText = JSON.stringify(state);

    if (storage.getItem(HOME_ARENA_STORAGE_KEY) === nextStateText) return;

    storage.setItem(HOME_ARENA_STORAGE_KEY, nextStateText);
    emitHomeArenaStorageChange();
  } catch {
    // Ignore blocked storage; the current React state remains usable.
  }
}

export function clearStoredHomeArenaState() {
  try {
    homeArenaStorage()?.removeItem(HOME_ARENA_STORAGE_KEY);
    emitHomeArenaStorageChange();
  } catch {
    // Ignore blocked storage during reset.
  }
}

export function subscribeToHomeArenaStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(HOME_ARENA_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(HOME_ARENA_STORAGE_EVENT, onStoreChange);
  };
}
