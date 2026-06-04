import type {
  BattleReportJson,
  ReportArgumentChain,
  ReportClaim,
  ReportComparisonRow,
  ReportSource,
} from "./types";

export type FindingRecord = {
  title: string;
  detail: string;
  tone: "filed" | "caution";
};

function comparableText(text: string | undefined) {
  return (text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function compactUniqueTexts(values: string[]) {
  const seen = new Set<string>();
  const uniqueValues: string[] = [];

  for (const value of values) {
    const signature = comparableText(value);
    if (!signature || seen.has(signature)) continue;

    seen.add(signature);
    uniqueValues.push(value);
  }

  return uniqueValues;
}

export function groupClaims(claims: ReportClaim[]) {
  const groups = new Map<string, ReportClaim[]>();

  for (const claim of claims) {
    const category = (claim.category ?? claim.kind ?? "UNCATEGORIZED")
      .replace(/_/g, " ")
      .toUpperCase();
    groups.set(category, [...(groups.get(category) ?? []), claim]);
  }

  return Array.from(groups.entries());
}

export function buildFindingRecords(
  factors: string[],
  comparison: ReportComparisonRow[],
  decisiveChain: ReportArgumentChain | null,
  fallbackDetail: string,
): FindingRecord[] {
  const sourceFactors = compactUniqueTexts(
    factors.length ? factors : comparison.map((row) => row.category),
  );

  if (!sourceFactors.length) {
    return [
      {
        title: "ROUTE STABILITY",
        detail: decisiveChain?.conclusion ?? fallbackDetail,
        tone: "filed",
      },
    ];
  }

  const usedRowIndexes = new Set<number>();
  const usedDetails = new Set<string>();
  const findings: FindingRecord[] = [];

  for (const factor of sourceFactors) {
    if (findings.length >= 5) break;

    const match = matchingComparisonRow(factor, comparison, usedRowIndexes);
    const row = match?.row ?? null;
    const detail = row?.reason ?? decisiveChain?.conclusion ?? fallbackDetail;
    const detailSignature = comparableText(detail);

    if (detailSignature && usedDetails.has(detailSignature)) continue;
    if (match) usedRowIndexes.add(match.index);
    if (detailSignature) usedDetails.add(detailSignature);

    findings.push({
      title: displayVerdict(row?.category ?? factor),
      detail,
      tone: row?.contested ? "caution" : "filed",
    });
  }

  return findings.length
    ? findings
    : [
        {
          title: "ROUTE STABILITY",
          detail: decisiveChain?.conclusion ?? fallbackDetail,
          tone: "filed",
        },
      ];
}

export function matchingComparisonRow(
  factor: string,
  comparison: ReportComparisonRow[],
  usedRowIndexes: Set<number> = new Set(),
) {
  const normalizedFactor = factor.toUpperCase();

  const directMatchIndex = comparison.findIndex(
    (row, index) =>
      !usedRowIndexes.has(index) &&
      normalizedFactor.includes(row.category.toUpperCase()),
  );

  if (directMatchIndex >= 0) {
    return {
      row: comparison[directMatchIndex],
      index: directMatchIndex,
    };
  }

  const fallbackIndex = comparison.findIndex(
    (_, index) => !usedRowIndexes.has(index),
  );

  return fallbackIndex >= 0
    ? {
        row: comparison[fallbackIndex],
        index: fallbackIndex,
      }
    : null;
}

export function qualityWarnings(report: BattleReportJson) {
  if (!report.quality_flags) return [];

  return Object.entries(report.quality_flags)
    .filter(([, value]) => value === true)
    .map(([key]) => key.replace(/^has_/, "").replace(/_/g, " ").toUpperCase());
}

export function objectRows(record: unknown): Array<[string, unknown]> {
  if (!record || typeof record !== "object") return [["status", "NONE_FILED"]];

  return Object.entries(record as Record<string, unknown>);
}

export function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return boolText(value);
  if (Array.isArray(value)) return value.length ? value.join(", ") : "N/A";

  return String(value);
}

export function displayTitle(text: string) {
  return text.trim().replace(/\s+/g, " ").toUpperCase();
}

export function displayVerdict(text: string) {
  return text
    .trim()
    .replace(/\s*\/\/\s*/g, " / ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function sourceSummary(source: ReportSource | undefined) {
  if (!source) return "source: none filed";

  return [
    source.type ? `source: ${source.type}` : "source: filed",
    source.ref ? `ref: ${source.ref}` : null,
    source.status ? `status: ${source.status}` : null,
    source.reliability ? `reliability: ${source.reliability}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function hasSourceRisk(source: ReportSource | undefined) {
  const status = source?.status?.toUpperCase() ?? "";
  const reliability = source?.reliability?.toUpperCase() ?? "";

  return (
    status.includes("REQUIRES") ||
    status.includes("UNVERIFIED") ||
    reliability.includes("UNKNOWN") ||
    reliability.includes("LOW")
  );
}

export function boolText(value: boolean | undefined) {
  if (value === undefined) return "N/A";

  return value ? "YES" : "NO";
}

export function percentText(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";

  return `${Math.round(value)}%`;
}

export function idList(ids: string[] | undefined) {
  return ids?.length ? ids.join(", ") : "NONE";
}
