import type { BattleReportJson } from "../model";

export type BattleReportRequest = {
  fighterA: string;
  fighterB: string;
  signal?: AbortSignal;
};

export type BattleCacheCheckResult = {
  cached: boolean;
  battleRunId: string | null;
};

export class BattleReportRequestError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "BattleReportRequestError";
    this.status = status;
    this.payload = payload;
  }
}

function readErrorMessage(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }

  return "Battle request failed";
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed) return null;

  const contentType = response.headers.get("content-type") ?? "";
  const looksLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[");

  if (contentType.includes("application/json") || looksLikeJson) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return {
        error: `Battle API returned malformed JSON (${response.status}).`,
        raw: trimmed.slice(0, 500),
      };
    }
  }

  if (response.status === 504) {
    return {
      error:
        "Battle API timed out on Vercel. The model call took too long to finish.",
      raw: trimmed.slice(0, 500),
    };
  }

  return {
    error: `Battle API returned a non-JSON response (${response.status}).`,
    raw: trimmed.slice(0, 500),
  };
}

export async function requestBattleReport({
  fighterA,
  fighterB,
  signal,
}: BattleReportRequest): Promise<BattleReportJson> {
  return requestBattleReportFromApi({ fighterA, fighterB, signal });
}

export async function requestBattleReportDev({
  fighterA,
  fighterB,
  signal,
}: BattleReportRequest): Promise<BattleReportJson> {
  const response = await fetch("/api/battle/dev", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fighterA,
      fighterB,
      options: {
        outputLanguage: "en",
      },
    }),
    signal,
  });
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new BattleReportRequestError(
      readErrorMessage(payload),
      response.status,
      payload,
    );
  }

  return payload as BattleReportJson;
}

export async function requestBattleReportFromApi({
  fighterA,
  fighterB,
  signal,
}: BattleReportRequest): Promise<BattleReportJson> {
  const response = await fetch("/api/battle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fighterA,
      fighterB,
      options: {
        outputLanguage: "en",
      },
    }),
    signal,
  });
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new BattleReportRequestError(
      readErrorMessage(payload),
      response.status,
      payload,
    );
  }

  return payload as BattleReportJson;
}

export async function checkBattleCache(
  fighterA: string,
  fighterB: string,
): Promise<BattleCacheCheckResult> {
  const params = new URLSearchParams({ fighterA, fighterB });
  const response = await fetch(`/api/battle/cache?${params.toString()}`);
  const payload = await response.json();

  return payload as BattleCacheCheckResult;
}
