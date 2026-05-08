import type { ThinkingLevel } from "../domain/schema";

export const BATTLE_MODEL_CONFIG = {
  model: "gemini-3-flash-preview",
  thinkingLevel: "high" satisfies ThinkingLevel,
  temperature: 1,
  topP: null,
  maxCompletionTokens: 16000,
  responseFormat: "json_schema",
} as const;

export const DEFAULT_MODEL = BATTLE_MODEL_CONFIG.model;
export const DEFAULT_THINKING_LEVEL = BATTLE_MODEL_CONFIG.thinkingLevel;
export const DEFAULT_TEMPERATURE = BATTLE_MODEL_CONFIG.temperature;
export const DEFAULT_TOP_P = BATTLE_MODEL_CONFIG.topP;
export const DEFAULT_MAX_COMPLETION_TOKENS =
  BATTLE_MODEL_CONFIG.maxCompletionTokens;
