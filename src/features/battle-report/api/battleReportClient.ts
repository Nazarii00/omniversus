import type { BattleReportJson } from "../model";

export type BattleReportRequest = {
  fighterA: string;
  fighterB: string;
  signal?: AbortSignal;
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

export async function requestBattleReport({
  fighterA,
  fighterB,
  signal,
}: BattleReportRequest): Promise<BattleReportJson> {
  return requestBattleReportFromApi({ fighterA, fighterB, signal });
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
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new BattleReportRequestError(
      readErrorMessage(payload),
      response.status,
      payload,
    );
  }

  return payload as BattleReportJson;
}
