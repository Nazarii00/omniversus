import { describe, expect, test } from "@/test/testing";

import { resolveBattleProvider } from ".";
import { resolveVertexBattleModel } from "./vertex/client";

function withProviderEnv(value: string | undefined, run: () => void) {
  const previousBattleProvider = process.env.BATTLE_AI_PROVIDER;
  const previousAiProvider = process.env.AI_PROVIDER;

  try {
    delete process.env.AI_PROVIDER;

    if (value === undefined) {
      delete process.env.BATTLE_AI_PROVIDER;
    } else {
      process.env.BATTLE_AI_PROVIDER = value;
    }

    run();
  } finally {
    if (previousBattleProvider === undefined) {
      delete process.env.BATTLE_AI_PROVIDER;
    } else {
      process.env.BATTLE_AI_PROVIDER = previousBattleProvider;
    }

    if (previousAiProvider === undefined) {
      delete process.env.AI_PROVIDER;
    } else {
      process.env.AI_PROVIDER = previousAiProvider;
    }
  }
}

describe("battle provider resolver", () => {
  test("defaults to the Gemini provider", () => {
    withProviderEnv(undefined, () => {
      expect(resolveBattleProvider().id).toBe("gemini");
    });
  });

  test("accepts Vertex provider aliases without exposing Vertex details upstream", () => {
    withProviderEnv("vertex", () => {
      expect(resolveBattleProvider().id).toBe("vertex-ai");
    });

    withProviderEnv("vertex-ai", () => {
      expect(resolveBattleProvider().id).toBe("vertex-ai");
    });
  });

  test("rejects unsupported provider ids early", () => {
    withProviderEnv("unknown-provider", () => {
      let message = "";

      try {
        resolveBattleProvider();
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      expect(message).toContain("Unsupported battle AI provider");
    });
  });
});

describe("Vertex model normalization", () => {
  test("adds the OpenAI-compatible google prefix to Gemini model ids", () => {
    expect(resolveVertexBattleModel("gemini-3.5-flash")).toBe(
      "google/gemini-3.5-flash",
    );
  });

  test("preserves already-prefixed and non-Gemini model ids", () => {
    expect(resolveVertexBattleModel("google/gemini-3.1-pro-preview")).toBe(
      "google/gemini-3.1-pro-preview",
    );
    expect(resolveVertexBattleModel("publishers/google/models/gemma")).toBe(
      "publishers/google/models/gemma",
    );
  });
});
