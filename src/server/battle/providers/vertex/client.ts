import { GoogleAuth } from "google-auth-library";
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

declare const process: {
  env: Record<string, string | undefined>;
};

const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const DEFAULT_VERTEX_LOCATION = "global";
const VERTEX_OPENAI_API_BASE =
  "https://aiplatform.googleapis.com/v1/projects";

let cachedAuth: GoogleAuth | null = null;

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();

  return value ? value : null;
}

function getAuth() {
  cachedAuth ??= new GoogleAuth({
    scopes: [CLOUD_PLATFORM_SCOPE],
  });

  return cachedAuth;
}

async function resolveVertexProjectId(): Promise<string> {
  const envProjectId =
    readEnv("VERTEX_PROJECT_ID") ??
    readEnv("GOOGLE_CLOUD_PROJECT") ??
    readEnv("GCLOUD_PROJECT");

  if (envProjectId) return envProjectId;

  try {
    const projectId = await getAuth().getProjectId();
    if (projectId) return projectId;
  } catch {
    // Keep the public error below focused on configuration, not auth internals.
  }

  throw new Error(
    "VERTEX_PROJECT_ID is not set and Google Auth could not infer a project. Configure ADC or set VERTEX_PROJECT_ID.",
  );
}

function resolveVertexLocation(): string {
  return readEnv("VERTEX_LOCATION") ?? DEFAULT_VERTEX_LOCATION;
}

function buildVertexOpenAiBaseUrl(projectId: string, location: string) {
  return `${VERTEX_OPENAI_API_BASE}/${encodeURIComponent(
    projectId,
  )}/locations/${encodeURIComponent(location)}/endpoints/openapi`;
}

async function getVertexAccessToken(): Promise<string> {
  const authClient = await getAuth().getClient();
  const accessToken = await authClient.getAccessToken();
  const token =
    typeof accessToken === "string" ? accessToken : accessToken?.token;

  if (!token) {
    throw new Error(
      "Google Auth did not return a Vertex AI access token. Configure Application Default Credentials with cloud-platform scope.",
    );
  }

  return token;
}

export function resolveVertexBattleModel(model?: string): string {
  const resolvedModel = model ?? readEnv("VERTEX_MODEL") ?? DEFAULT_MODEL;
  const trimmedModel = resolvedModel.trim();

  if (!trimmedModel) return `google/${DEFAULT_MODEL}`;
  if (trimmedModel.startsWith("google/")) return trimmedModel;
  if (trimmedModel.startsWith("gemini-")) return `google/${trimmedModel}`;

  return trimmedModel;
}

export async function getVertexClient(): Promise<OpenAI> {
  const [accessToken, projectId] = await Promise.all([
    getVertexAccessToken(),
    resolveVertexProjectId(),
  ]);
  const location = resolveVertexLocation();

  return new OpenAI({
    apiKey: accessToken,
    baseURL: buildVertexOpenAiBaseUrl(projectId, location),
  });
}

export function buildVertexResponseFormat(): ChatCompletionRequest["response_format"] {
  return buildOpenAiCompatibleBattleResponseFormat();
}

export async function createVertexBattleCompletion(
  request: ChatCompletionRequest,
): Promise<BattleCompletionResult> {
  const client = await getVertexClient();

  return createOpenAiCompatibleBattleCompletion(client, request, "vertex-ai");
}

export function isVertexStructuredOutputSchemaError(error: unknown): boolean {
  return isOpenAiCompatibleStructuredOutputSchemaError(error);
}

export const vertexBattleProvider: BattleProvider = {
  id: "vertex-ai",
  label: "Vertex AI",
  buildBattleResponseFormat: buildVertexResponseFormat,
  createBattleCompletion: createVertexBattleCompletion,
  isStructuredOutputSchemaError: isVertexStructuredOutputSchemaError,
  resolveBattleModel: resolveVertexBattleModel,
};
