import type { BattleCompletionResult } from "./providers/openaiCompatible";
import type { BattleGenerationMetadata, ThinkingLevel } from "./domain/schema";
import { safeNumber } from "./config/params";

export function buildGenerationMetadata(
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
    provider: completionResult.provider,
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
