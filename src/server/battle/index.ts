import {
  type BattleCompletionResult,
  buildBattleResponseFormat,
  createBattleCompletion,
  getClient,
  isGeminiStructuredOutputSchemaError,
  resolveBattleModel,
} from "./providers/gemini/client";
import { prepareBattleOutput } from "./pipeline/prepareBattleOutput";
import {
  DEFAULT_MAX_COMPLETION_TOKENS,
  DEFAULT_TEMPERATURE,
  DEFAULT_THINKING_LEVEL,
  DEFAULT_TOP_P,
} from "./config/model";
import { normalizeBattleResult } from "./pipeline/normalize";
import {
  buildUserPrompt,
  OMNIVERSUS_MASTER_PROMPT,
} from "./prompts/battlePrompt";
import {
  resolveBattleDossierContext,
  type BattleDossierContext,
  type DossierPortrait,
} from "./dossier";
import {
  OmniversusBattleSchema,
  type BattleGenerationMetadata,
  type OmniversusBattle,
  type RunBattleAnalysisOptions,
  type ThinkingLevel,
} from "./domain/schema";

export type {
  BattleGenerationMetadata,
  OmniversusBattle,
  RunBattleAnalysisOptions,
} from "./domain/schema";
export { OmniversusBattleSchema } from "./domain/schema";
export {
  buildGeminiResponseFormat,
  createBattleCompletion,
  getClient,
} from "./providers/gemini/client";
export { prepareBattleOutput } from "./pipeline/prepareBattleOutput";
export { mapGeminiBattleOutput } from "./pipeline/mapGeminiOutput";
export {
  completeBattleRunRecord,
  createBattleRunRecord,
  failBattleRunRecord,
  type BattleRunHandle,
} from "./runs";
export {
  enforceBusinessCaps,
  normalizeBattleResult,
} from "./pipeline/normalize";
export { BATTLE_MODEL_CONFIG } from "./config/model";
export {
  buildUserPrompt,
  OMNIVERSUS_MASTER_PROMPT,
} from "./prompts/battlePrompt";
export {
  resolveBattleDossierContext,
  type BattleDossierContext,
  type DossierPortrait,
  type DossierFact,
  type FighterDossier,
} from "./dossier";

type RunBattleAnalysisWithMetadataResult = {
  result: OmniversusBattle;
  generation: BattleGenerationMetadata;
};

type BattleAnalysisErrorOptions = {
  status?: number;
  generation?: BattleGenerationMetadata;
  validationIssues?: unknown[];
};

export class BattleAnalysisError extends Error {
  readonly status: number;
  readonly generation: BattleGenerationMetadata | null;
  readonly validationIssues: unknown[] | null;

  constructor(message: string, options: BattleAnalysisErrorOptions = {}) {
    super(message);
    this.name = "BattleAnalysisError";
    this.status = options.status ?? 500;
    this.generation = options.generation ?? null;
    this.validationIssues = options.validationIssues ?? null;
  }
}

function hasRefusal(message: unknown): message is { refusal: string } {
  return (
    typeof message === "object" &&
    message !== null &&
    "refusal" in message &&
    typeof (message as { refusal?: unknown }).refusal === "string"
  );
}

function parseJsonObject(content: string): unknown {
  const trimmed = content.trim();

  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();

    return JSON.parse(withoutFence);
  }

  return JSON.parse(trimmed);
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeTemperature(value: unknown): number {
  const parsed = readNumber(value);
  return parsed === null ? DEFAULT_TEMPERATURE : clampNumber(parsed, 0, 2);
}

function normalizeTopP(value: unknown): number | null {
  const parsed = readNumber(value);
  return parsed === null ? DEFAULT_TOP_P : clampNumber(parsed, 0, 1);
}

function normalizeMaxCompletionTokens(value: unknown): number | null {
  const parsed = readNumber(value);
  if (parsed === null) return DEFAULT_MAX_COMPLETION_TOKENS;
  return Math.round(clampNumber(parsed, 1, DEFAULT_MAX_COMPLETION_TOKENS));
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildGenerationMetadata(
  completionResult: BattleCompletionResult,
  request: {
    model: string;
    reasoningEffort: ThinkingLevel;
    temperature: number | null;
    topP: number | null;
    maxCompletionTokens: number | null;
    startedAtMs: number;
  },
  content: string | null,
): BattleGenerationMetadata {
  const completedAtMs = Date.now();
  const completion = completionResult.completion;
  const choice = completion.choices[0];
  const usage = completion.usage;
  const promptDetails = usage?.prompt_tokens_details as
    | { cached_tokens?: unknown }
    | undefined;
  const completionDetails = usage?.completion_tokens_details as
    | { reasoning_tokens?: unknown }
    | undefined;
  const requestId = (completion as { _request_id?: unknown })._request_id;

  return {
    provider: "gemini",
    api: completionResult.api,
    requested_model: request.model,
    model: completion.model ?? null,
    thinking_level: request.reasoningEffort,
    temperature: request.temperature,
    top_p: request.topP,
    max_completion_tokens: request.maxCompletionTokens,
    response_format: completionResult.responseFormat,
    response_format_fallback_used: completionResult.responseFormatFallbackUsed,
    id: completion.id ?? null,
    request_id: typeof requestId === "string" ? requestId : null,
    created: safeNumber(completion.created),
    finish_reason: choice?.finish_reason ?? null,
    service_tier: completion.service_tier ?? null,
    system_fingerprint: completion.system_fingerprint ?? null,
    usage: usage
      ? {
          prompt_tokens: safeNumber(usage.prompt_tokens),
          completion_tokens: safeNumber(usage.completion_tokens),
          total_tokens: safeNumber(usage.total_tokens),
          cached_tokens: safeNumber(promptDetails?.cached_tokens),
          reasoning_tokens: safeNumber(completionDetails?.reasoning_tokens),
          prompt_tokens_details: usage.prompt_tokens_details ?? null,
          completion_tokens_details: usage.completion_tokens_details ?? null,
        }
      : null,
    content_length: content === null ? null : content.length,
    timings: {
      started_at: new Date(request.startedAtMs).toISOString(),
      completed_at: new Date(completedAtMs).toISOString(),
      duration_ms: completedAtMs - request.startedAtMs,
    },
  };
}

function providerErrorStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }

  return null;
}

function providerErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "";
}

function providerErrorMessage(error: unknown): string {
  const status = providerErrorStatus(error);
  const detail = providerErrorDetail(error);

  if (isGeminiStructuredOutputSchemaError(error)) {
    return detail
      ? `Gemini rejected the structured output schema: ${detail}`
      : "Gemini rejected the structured output schema.";
  }

  if (status === 400) {
    return detail
      ? `Gemini rejected the battle generation request: ${detail}`
      : "Gemini rejected the battle generation request.";
  }

  if (status === 429) {
    return detail
      ? `Gemini rate limit or quota was hit: ${detail}`
      : "Gemini rate limit or quota was hit. Wait a bit, then retry with the same fighters.";
  }

  if (status && status >= 500) {
    return "Gemini provider is temporarily unavailable. Retry the battle request shortly.";
  }

  if (error instanceof Error) return error.message;
  return "Gemini provider request failed";
}

export async function runBattleAnalysisWithMetadata(
  fighterA: string,
  fighterB: string,
  options: RunBattleAnalysisOptions = {},
): Promise<RunBattleAnalysisWithMetadataResult> {
  const client = getClient();
  const model = resolveBattleModel(options.model);
  const reasoningEffort = options.thinkingLevel ?? DEFAULT_THINKING_LEVEL;
  const temperature = normalizeTemperature(options.temperature);
  const topP = normalizeTopP(options.topP);
  const maxCompletionTokens = normalizeMaxCompletionTokens(
    options.maxCompletionTokens,
  );
  const startedAtMs = Date.now();
  const dossierContext = await resolveBattleDossierContext(
    fighterA,
    fighterB,
    options,
  );

  const completionRequest: Parameters<typeof createBattleCompletion>[1] = {
    model,
    reasoning_effort: reasoningEffort,
    temperature,
    ...(topP !== null ? { top_p: topP } : {}),
    ...(maxCompletionTokens !== null
      ? { max_completion_tokens: maxCompletionTokens }
      : {}),
    messages: [
      { role: "system", content: OMNIVERSUS_MASTER_PROMPT },
      {
        role: "user",
        content: buildUserPrompt(fighterA, fighterB, options, dossierContext),
      },
    ],
    response_format: buildBattleResponseFormat(),
  };

  let completionResult: BattleCompletionResult;

  try {
    completionResult = await createBattleCompletion(client, completionRequest);
  } catch (error) {
    throw new BattleAnalysisError(providerErrorMessage(error), {
      status: providerErrorStatus(error) ?? 502,
    });
  }

  const completion = completionResult.completion;
  const requestMetadata = {
    model,
    reasoningEffort,
    temperature,
    topP,
    maxCompletionTokens,
    startedAtMs,
  };

  const message = completion.choices[0]?.message;
  if (!message) {
    throw new BattleAnalysisError("Empty response from AI", {
      status: 502,
      generation: buildGenerationMetadata(
        completionResult,
        requestMetadata,
        null,
      ),
    });
  }

  if (hasRefusal(message)) {
    throw new BattleAnalysisError(`AI refused to answer: ${message.refusal}`, {
      status: 502,
      generation: buildGenerationMetadata(
        completionResult,
        requestMetadata,
        null,
      ),
    });
  }

  const content = message.content;
  const textContent = typeof content === "string" ? content : "";
  const parsedContent = message.parsed;
  const generation = buildGenerationMetadata(
    completionResult,
    requestMetadata,
    textContent || null,
  );

  if (parsedContent === null && !textContent.trim()) {
    throw new BattleAnalysisError("AI returned empty or non-text content", {
      status: 502,
      generation,
    });
  }

  let raw: unknown;
  if (parsedContent !== null) {
    raw = parsedContent;
  } else {
    try {
      raw = parseJsonObject(textContent);
    } catch {
      throw new BattleAnalysisError("AI returned invalid JSON", {
        status: 502,
        generation,
      });
    }
  }

  const prepared = prepareBattleOutput(raw, {
    fighterA,
    fighterB,
    outputLanguage: options.outputLanguage,
    speedEqualized: options.speedEqualized,
  });
  const parsed = OmniversusBattleSchema.safeParse(prepared);

  if (!parsed.success) {
    throw new BattleAnalysisError(
      `Battle JSON contract validation failed: ${parsed.error.message}`,
      {
        status: 502,
        generation,
        validationIssues: parsed.error.issues,
      },
    );
  }

  const normalized = normalizeBattleResult(parsed.data);
  const normalizedParsed = OmniversusBattleSchema.safeParse(normalized);

  if (!normalizedParsed.success) {
    throw new BattleAnalysisError(
      `Battle JSON semantic validation failed: ${normalizedParsed.error.message}`,
      {
        status: 502,
        generation,
        validationIssues: normalizedParsed.error.issues,
      },
    );
  }

  return {
    result: attachDossierPortraits(normalizedParsed.data, dossierContext),
    generation,
  };
}

function attachDossierPortraits(
  result: OmniversusBattle,
  dossierContext: BattleDossierContext,
): OmniversusBattle {
  return {
    ...result,
    fighters: result.fighters.map((fighter) => {
      const portrait = portraitForSide(fighter.side, dossierContext);

      return portrait ? { ...fighter, portrait } : fighter;
    }),
  };
}

function portraitForSide(
  side: OmniversusBattle["fighters"][number]["side"],
  dossierContext: BattleDossierContext,
): DossierPortrait | null {
  return dossierContext[side].dossier?.portrait ?? null;
}

export async function runBattleAnalysis(
  fighterA: string,
  fighterB: string,
  options: RunBattleAnalysisOptions = {},
): Promise<OmniversusBattle> {
  const { result } = await runBattleAnalysisWithMetadata(
    fighterA,
    fighterB,
    options,
  );

  return result;
}

export default runBattleAnalysis;
