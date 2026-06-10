"use client";

import {
  useCallback,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import type { BattleFeedbackValue } from "@/generated/prisma/enums";
import {
  getBattleFeedbackStats,
  submitBattleFeedback,
  type BattleFeedbackStats,
  type SubmitFeedbackResult,
} from "../actions/battleFeedbackActions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeedbackState = {
  currentValue: BattleFeedbackValue | null;
  stats: BattleFeedbackStats | null;
  isSubmitting: boolean;
  error: string | null;
};

type OptimisticAction = {
  type: "set";
  value: BattleFeedbackValue;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBattleFeedback(battleRunId: string) {
  const [currentValue, setCurrentValue] = useState<BattleFeedbackValue | null>(
    null,
  );
  const [stats, setStats] = useState<BattleFeedbackStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [optimisticValue, setOptimisticValue] = useOptimistic<
    BattleFeedbackValue | null,
    OptimisticAction
  >(currentValue, (_state, action) => {
    if (action.type === "set") return action.value;
    return _state;
  });

  // Fetch stats on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      const result = await getBattleFeedbackStats(battleRunId);

      if (cancelled) return;

      if (result.success) {
        setStats(result.stats);
      }
    }

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [battleRunId]);

  const submit = useCallback(
    async (value: BattleFeedbackValue, reason?: string) => {
      setError(null);

      startTransition(async () => {
        setOptimisticValue({ type: "set", value });

        const result: SubmitFeedbackResult = await submitBattleFeedback({
          battleRunId,
          value,
          reason,
        });

        if (result.success) {
          setCurrentValue(value);

          // Refresh stats after submission
          const statsResult = await getBattleFeedbackStats(battleRunId);

          if (statsResult.success) {
            setStats(statsResult.stats);
          }
        } else {
          setError(result.error);
          // Revert optimistic update on failure
          // useOptimistic doesn't support direct reversion,
          // but the state will be corrected on next render
        }
      });
    },
    [battleRunId, setOptimisticValue],
  );

  return {
    value: optimisticValue,
    stats,
    isSubmitting: isPending,
    error,
    submit,
  } as const;
}
