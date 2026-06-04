import { geminiBattleProvider } from "./gemini/client";
import type { BattleProvider } from "./types";
import { vertexBattleProvider } from "./vertex/client";

declare const process: {
  env: Record<string, string | undefined>;
};

export const DEFAULT_BATTLE_PROVIDER_ID = "gemini";

function normalizeProviderId(value: string | undefined): BattleProvider["id"] {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) return DEFAULT_BATTLE_PROVIDER_ID;
  if (normalized === "vertex" || normalized === "vertex-ai") {
    return "vertex-ai";
  }
  if (normalized === "gemini" || normalized === "google-ai-studio") {
    return "gemini";
  }

  throw new Error(
    `Unsupported battle AI provider "${value}". Use "gemini" or "vertex-ai".`,
  );
}

export function resolveBattleProvider(
  providerId = process.env.BATTLE_AI_PROVIDER ?? process.env.AI_PROVIDER,
): BattleProvider {
  switch (normalizeProviderId(providerId)) {
    case "vertex-ai":
      return vertexBattleProvider;
    case "gemini":
      return geminiBattleProvider;
  }
}

export type { BattleProvider } from "./types";
