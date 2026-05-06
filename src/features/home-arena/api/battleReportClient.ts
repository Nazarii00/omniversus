import type { BattleReportJson } from "../types";
import { MOCK_BATTLE_REPORT } from "../data/mockBattleReport";

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
  // DESIGN_PLACEHOLDER_MODE:
  // API is temporarily detached from the UI. To reconnect the real endpoint,
  // uncomment the next return and remove/comment the placeholder return below.
  return requestBattleReportFromApi({ fighterA, fighterB, signal });
  /*
  void signal;
  return buildPlaceholderBattleReport(fighterA, fighterB);
  */
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

/*
function buildPlaceholderBattleReport(
  fighterA: string,
  fighterB: string,
): BattleReportJson {
  const alphaName = fighterA.trim() || "Contender Alpha";
  const omegaName = fighterB.trim() || "Contender Omega";
  const matchupTitle = `${alphaName} vs ${omegaName}`;
  const winnerName =
    MOCK_BATTLE_REPORT.verdict?.winner_side === "A" ? alphaName : omegaName;

  return {
    ...MOCK_BATTLE_REPORT,
    id: "design-placeholder-battle-report",
    headline: matchupTitle,
    metadata: {
      ...MOCK_BATTLE_REPORT.metadata,
      title: matchupTitle,
      battle_type: "DESIGN_PLACEHOLDER",
    },
    fighters: (MOCK_BATTLE_REPORT.fighters ?? []).map((fighter) => ({
      ...fighter,
      name: fighter.side === "A" ? alphaName : omegaName,
    })),
    verdict: {
      ...MOCK_BATTLE_REPORT.verdict,
      winner_name: winnerName,
    },
    ui: {
      ...MOCK_BATTLE_REPORT.ui,
      headline: matchupTitle,
      share_text: `${winnerName} wins in the design placeholder report.`,
      verdict_stamp: `${winnerName} WINS // ${
        MOCK_BATTLE_REPORT.verdict?.difficulty ?? "MID_DIFF"
      }`,
    },
  };
}

*/
