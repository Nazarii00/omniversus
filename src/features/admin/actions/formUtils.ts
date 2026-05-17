import type { PrismaClientInstance } from "@/server/db/prisma";
import { getPrisma } from "@/server/db/prisma";

type EnumLike = Record<string, string>;

export function assertAdminEnabled() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ADMIN_PANEL_ENABLED !== "true"
  ) {
    throw new Error("Admin panel is disabled in production");
  }
}

export function prismaOrThrow(): PrismaClientInstance {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error("DATABASE_URL or DIRECT_URL is required");
  }

  return prisma;
}

export function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function requiredString(
  formData: FormData,
  key: string,
  label: string,
): string {
  const value = readString(formData, key);
  if (!value) throw new Error(`${label} is required`);
  return value;
}

export function optionalString(formData: FormData, key: string): string | null {
  const value = readString(formData, key);
  return value || null;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeAlias(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function readEnum<T extends EnumLike>(
  enumObject: T,
  formData: FormData,
  key: string,
  fallback: T[keyof T],
): T[keyof T] {
  const value = readString(formData, key);
  const values = Object.values(enumObject) as Array<T[keyof T]>;
  return values.includes(value as T[keyof T])
    ? (value as T[keyof T])
    : fallback;
}

export function readScore(
  formData: FormData,
  key: string,
  fallback = 50,
): number {
  const raw = readString(formData, key);
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}

export function readBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

export function readAliases(formData: FormData, displayName: string): string[] {
  const rawAliases = readString(formData, "aliases")
    .split(",")
    .map((alias) => alias.trim())
    .filter(Boolean);
  return Array.from(new Set([displayName, ...rawAliases]));
}
