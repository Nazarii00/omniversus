import OpenAI from "openai";
import type { ParsedChatCompletion } from "openai/resources/chat/completions";

import type { BattleGenerationProvider } from "../domain/schema";
import {
  GeminiBattleOutputJsonSchema,
  type GeminiBattleOutput,
} from "./gemini/outputSchema";

export type ChatCompletionRequest =
  OpenAI.Chat.ChatCompletionCreateParamsNonStreaming;
export type ChatCompletionResponse = ParsedChatCompletion<GeminiBattleOutput>;
export type ResponseFormatType = NonNullable<
  ChatCompletionRequest["response_format"]
>["type"];

export type BattleCompletionResult = {
  completion: ChatCompletionResponse;
  responseFormat: ResponseFormatType | null;
  responseFormatFallbackUsed: boolean;
  api: "openai-compatible-chat-completions";
  provider: BattleGenerationProvider;
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toOpenAiCompatibleStrictSchema(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => toOpenAiCompatibleStrictSchema(item));
  }

  if (!isJsonObject(value)) return value;

  const schema: JsonObject = {};

  for (const [key, child] of Object.entries(value)) {
    if (key === "propertyOrdering") continue;
    schema[key] = toOpenAiCompatibleStrictSchema(child);
  }

  if (schema.type === "object") {
    const properties = schema.properties;

    if (isJsonObject(properties)) {
      schema.required = Object.keys(properties);
    }

    schema.additionalProperties = false;
  }

  return schema;
}

function providerErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "";
}

export function isOpenAiCompatibleStructuredOutputSchemaError(
  error: unknown,
): boolean {
  const detail = providerErrorDetail(error).toLowerCase();

  return [
    "schema",
    "json_schema",
    "response_format",
    "additionalproperties",
    "propertyordering",
    "structured output",
    "generationconfig.responseformat",
  ].some((signal) => detail.includes(signal));
}

export function buildOpenAiCompatibleBattleResponseFormat(): ChatCompletionRequest["response_format"] {
  return {
    type: "json_schema",
    json_schema: {
      name: "omniversus_battle",
      strict: true,
      schema: toOpenAiCompatibleStrictSchema(
        GeminiBattleOutputJsonSchema as unknown as JsonValue,
      ) as Record<string, unknown>,
    },
  };
}

export async function createOpenAiCompatibleBattleCompletion(
  client: OpenAI,
  request: ChatCompletionRequest,
  provider: BattleGenerationProvider,
): Promise<BattleCompletionResult> {
  return {
    completion: (await client.chat.completions.parse(
      request,
    )) as ChatCompletionResponse,
    responseFormat: request.response_format?.type ?? null,
    responseFormatFallbackUsed: false,
    api: "openai-compatible-chat-completions",
    provider,
  };
}
