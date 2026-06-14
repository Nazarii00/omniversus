import {
  type BattleCompletionResult,
  type ChatCompletionRequest,
} from "./providers/openaiCompatible";
import { resolveBattleProvider } from "./providers";
import { prepareBattleOutput } from "./pipeline/prepareBattleOutput";
import { DEFAULT_THINKING_LEVEL } from "./config/model";
import { normalizeBattleResult } from "./pipeline/normalize";
import {
  buildUserPrompt,
  OMNIVERSUS_DEV_PROMPT,
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
} from "./domain/schema";
import {
  normalizeTemperature,
  normalizeTopP,
  normalizeMaxCompletionTokens,
} from "./config/params";
import { hasRefusal, parseJsonObject } from "./pipeline/parseResponse";
import { buildGenerationMetadata } from "./generation";
import { providerErrorMessage, providerErrorStatus } from "./providers/errors";

// ─── Re-exports ─────────────────────────────────────────────────────

export type {
  BattleGenerationMetadata,
  OmniversusBattle,
  RunBattleAnalysisOptions,
} from "./domain/schema";
export { OmniversusBattleSchema } from "./domain/schema";
export { resolveBattleProvider } from "./providers";
export { prepareBattleOutput } from "./pipeline/prepareBattleOutput";
export { mapGeminiBattleOutput } from "./pipeline/mapGeminiOutput";
export {
  completeBattleRunRecord,
  createBattleRunRecord,
  failBattleRunRecord,
  type BattleRunHandle,
} from "./runs";
export {
  buildBattleCacheKey,
  findCachedBattleResult,
  type CachedBattleResult,
} from "./cache";
export { orientBattleResultForRequest } from "./cacheOrientation";
export {
  enforceBusinessCaps,
  normalizeBattleResult,
} from "./pipeline/normalize";
export { BATTLE_MODEL_CONFIG } from "./config/model";
export {
  buildUserPrompt,
  OMNIVERSUS_MASTER_PROMPT,
  OMNIVERSUS_DEV_PROMPT,
} from "./prompts/battlePrompt";
export {
  resolveBattleDossierContext,
  type BattleDossierContext,
  type DossierPortrait,
  type DossierFact,
  type FighterDossier,
} from "./dossier";
export { computeBattleQualityScore } from "./quality";
export { checkDailyBattleLimit, type DailyLimitCheck } from "./limits";

// ─── BattleAnalysisError ────────────────────────────────────────────

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

// ─── Core: runBattleAnalysisWithMetadata ────────────────────────────

type RunBattleAnalysisWithMetadataResult = {
  result: OmniversusBattle;
  generation: BattleGenerationMetadata;
};

export async function runBattleAnalysisWithMetadata(
  fighterA: string,
  fighterB: string,
  options: RunBattleAnalysisOptions = {},
): Promise<RunBattleAnalysisWithMetadataResult> {
  const provider = resolveBattleProvider();
  const model = provider.resolveBattleModel(options.model);
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

  const systemPrompt = options.devMode
    ? OMNIVERSUS_DEV_PROMPT
    : OMNIVERSUS_MASTER_PROMPT;

  const completionRequest: ChatCompletionRequest = {
    model,
    reasoning_effort: reasoningEffort,
    temperature,
    ...(topP !== null ? { top_p: topP } : {}),
    ...(maxCompletionTokens !== null
      ? { max_completion_tokens: maxCompletionTokens }
      : {}),
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: buildUserPrompt(fighterA, fighterB, options, dossierContext),
      },
    ],
    response_format: provider.buildBattleResponseFormat(),
  };

  let completionResult: BattleCompletionResult;

  try {
    completionResult = await provider.createBattleCompletion(completionRequest);
  } catch (error) {
    throw new BattleAnalysisError(providerErrorMessage(error, provider), {
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

// ─── Core: runBattleAnalysis ────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────

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
