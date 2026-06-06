"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  parseStoredHomeArenaState,
  readStoredHomeArenaStateText,
  subscribeToHomeArenaStorage,
} from "../state/homeArenaStorage";

export default function useStoredHomeArenaState() {
  const storedArenaStateText = useSyncExternalStore(
    subscribeToHomeArenaStorage,
    readStoredHomeArenaStateText,
    () => null,
  );
  const storedArenaState = useMemo(
    () => parseStoredHomeArenaState(storedArenaStateText),
    [storedArenaStateText],
  );

  return { storedArenaState, storedArenaStateText };
}
