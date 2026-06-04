import OpenAI from "openai";

import { DEFAULT_MODEL } from "../../config/model";
import {
  buildOpenAiCompatibleBattleResponseFormat,
  createOpenAiCompatibleBattleCompletion,
  isOpenAiCompatibleStructuredOutputSchemaError,
  type BattleCompletionResult,
  type ChatCompletionRequest,
} from "../openaiCompatible";
import type { BattleProvider } from "../types";

export { DEFAULT_MODEL } from "../../config/model";

declare const process: {
  env: Record<string, string | undefined>;
};

const GEMINI_OPENAI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";
let cachedClient: OpenAI | null = null;

export function getClient(): OpenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  cachedClient ??= new OpenAI({
    apiKey,
    baseURL: GEMINI_OPENAI_BASE_URL,
  });

  return cachedClient;
}

export function resolveBattleModel(model?: string): string {
  return model ?? DEFAULT_MODEL;
}

export function buildGeminiResponseFormat(): ChatCompletionRequest["response_format"] {
  return buildOpenAiCompatibleBattleResponseFormat();
}

export function buildBattleResponseFormat(): ChatCompletionRequest["response_format"] {
  return buildGeminiResponseFormat();
}

export async function createBattleCompletion(
  request: ChatCompletionRequest,
): Promise<BattleCompletionResult> {
  return createOpenAiCompatibleBattleCompletion(
    getClient(),
    request,
    "gemini",
  );
}

export function isGeminiStructuredOutputSchemaError(error: unknown): boolean {
  return isOpenAiCompatibleStructuredOutputSchemaError(error);
}

export const geminiBattleProvider: BattleProvider = {
  id: "gemini",
  label: "Gemini API",
  buildBattleResponseFormat,
  createBattleCompletion,
  isStructuredOutputSchemaError: isGeminiStructuredOutputSchemaError,
  resolveBattleModel,
};
