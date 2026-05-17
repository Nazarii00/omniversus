import OpenAI from "openai";
import type { ParsedChatCompletion } from "openai/resources/chat/completions";

import {
  GeminiBattleOutputJsonSchema,
  type GeminiBattleOutput,
} from "./outputSchema";
import { DEFAULT_MODEL } from "../../config/model";

export { DEFAULT_MODEL } from "../../config/model";

declare const process: {
  env: Record<string, string | undefined>;
};

type ChatCompletionRequest = OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;
type ChatCompletionResponse = ParsedChatCompletion<GeminiBattleOutput>;
type ResponseFormatType = NonNullable<
  ChatCompletionRequest["response_format"]
>["type"];

export type BattleCompletionResult = {
  completion: ChatCompletionResponse;
  responseFormat: ResponseFormatType | null;
  responseFormatFallbackUsed: boolean;
  api: "openai-compatible-chat-completions";
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
  return {
    type: "json_schema",
    json_schema: {
      name: "omniversus_battle",
      strict: true,
      schema: GeminiBattleOutputJsonSchema as Record<string, unknown>,
    },
  };
}

export function buildBattleResponseFormat(): ChatCompletionRequest["response_format"] {
  return buildGeminiResponseFormat();
}

async function createChatCompletion(
  client: OpenAI,
  request: ChatCompletionRequest,
) {
  return (await client.chat.completions.parse(
    request,
  )) as ChatCompletionResponse;
}

export async function createBattleCompletion(
  client: OpenAI,
  request: ChatCompletionRequest,
): Promise<BattleCompletionResult> {
  return {
    completion: await createChatCompletion(client, request),
    responseFormat: request.response_format?.type ?? null,
    responseFormatFallbackUsed: false,
    api: "openai-compatible-chat-completions",
  };
}
