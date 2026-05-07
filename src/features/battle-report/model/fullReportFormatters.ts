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
  const sourceFactors = factors.length
    ? factors
    : comparison.map((row) => row.category);

  if (!sourceFactors.length) {
    return [
      {
        title: "ROUTE STABILITY",
        detail: decisiveChain?.conclusion ?? fallbackDetail,
        tone: "filed",
      },
    ];
  }

  return sourceFactors.slice(0, 5).map((factor, index) => {
    const row = matchingComparisonRow(factor, comparison, index);

    return {
      title: displayVerdict(row?.category ?? factor),
      detail: row?.reason ?? decisiveChain?.conclusion ?? fallbackDetail,
      tone: row?.contested ? "caution" : "filed",
    };
  });
}

export function matchingComparisonRow(
  factor: string,
  comparison: ReportComparisonRow[],
  index: number,
) {
  const normalizedFactor = factor.toUpperCase();

  return (
    comparison.find((row) =>
      normalizedFactor.includes(row.category.toUpperCase()),
    ) ??
    comparison[index] ??
    null
  );
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
