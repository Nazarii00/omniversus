export type ReportAppealTargetType = "claim" | "premise";

export type ReportAppealTarget = {
  reportId: string;
  reportTitle: string;
  targetType: ReportAppealTargetType;
  targetId: string;
  targetText: string;
  subjectName: string;
  subjectVersion?: string;
  side?: string;
  category?: string;
  claimId?: string;
  chainId?: string;
  sourceRef?: string;
  confidence?: number;
};

export type ReportAppealInput = ReportAppealTarget & {
  body: string;
  proposedText?: string;
  submitterName?: string;
  submitterContact?: string;
};

export type ReportAppealResult = {
  appealId: string;
  status: string;
};

export class ReportAppealError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ReportAppealError";
    this.status = status;
    this.payload = payload;
  }
}

function readErrorMessage(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }

  return "Appeal request failed";
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      error: `Appeal API returned malformed JSON (${response.status}).`,
    };
  }
}

export async function submitReportAppeal(
  appeal: ReportAppealInput,
): Promise<ReportAppealResult> {
  const response = await fetch("/api/appeals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(appeal),
  });
  const payload = await readPayload(response);

  if (!response.ok) {
    throw new ReportAppealError(
      readErrorMessage(payload),
      response.status,
      payload,
    );
  }

  return payload as ReportAppealResult;
}
