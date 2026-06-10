import {
  DEFAULT_MAX_COMPLETION_TOKENS,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
} from "./model";

export function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeTemperature(value: unknown): number {
  const parsed = readNumber(value);
  return parsed === null ? DEFAULT_TEMPERATURE : clampNumber(parsed, 0, 2);
}

export function normalizeTopP(value: unknown): number | null {
  const parsed = readNumber(value);
  return parsed === null ? DEFAULT_TOP_P : clampNumber(parsed, 0, 1);
}

export function normalizeMaxCompletionTokens(value: unknown): number | null {
  const parsed = readNumber(value);
  if (parsed === null) return DEFAULT_MAX_COMPLETION_TOKENS;
  return Math.round(clampNumber(parsed, 1, DEFAULT_MAX_COMPLETION_TOKENS));
}

export function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
