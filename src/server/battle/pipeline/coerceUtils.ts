import type { OmniversusBattle } from "../domain/schema";

export function clampConfidenceBand(
  score: number,
): OmniversusBattle["verdict"]["confidence_band"] {
  if (score >= 80) return "DOMINANT_80_100";
  if (score >= 65) return "CONFIDENT_65_79";
  if (score >= 50) return "CONTESTED_50_64";
  return "INDETERMINATE_1_49";
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

export function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function isPlaceholderArrayItem(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ["none", "n/a", "na", "n_a", "unknown", "null"].includes(normalized);
}

export function asStringArray(value: unknown): string[] {
  return asArray(value)
    .map((item) => asString(item))
    .filter((item) => item && !isPlaceholderArrayItem(item));
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(normalized)) return true;
    if (["false", "no", "0"].includes(normalized)) return false;
  }

  return fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const numeric = Number(value.replace("%", "").trim());
    if (Number.isFinite(numeric)) return numeric;
  }

  return fallback;
}

export function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const numeric = Math.round(asNumber(value, fallback));
  return Math.max(min, Math.min(max, numeric));
}

export function normalizeToken(value: unknown): string {
  return asString(value)
    .trim()
    .replace(/[\[\]]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

export function pickEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
  aliases: Record<string, T[number]> = {},
): T[number] {
  const raw = asString(value).trim();

  if (allowed.includes(raw as T[number])) {
    return raw as T[number];
  }

  const lower = raw.toLowerCase();
  if (allowed.includes(lower as T[number])) {
    return lower as T[number];
  }

  const token = normalizeToken(value);
  return (
    aliases[token] ??
    (allowed.includes(token as T[number]) ? (token as T[number]) : fallback)
  );
}
