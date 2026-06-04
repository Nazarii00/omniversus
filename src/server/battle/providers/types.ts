import type {
  BattleCompletionResult,
  ChatCompletionRequest,
} from "./openaiCompatible";
import type { BattleGenerationProvider } from "../domain/schema";

export type BattleProvider = {
  id: BattleGenerationProvider;
  label: string;
  buildBattleResponseFormat(): ChatCompletionRequest["response_format"];
  createBattleCompletion(
    request: ChatCompletionRequest,
  ): Promise<BattleCompletionResult>;
  isStructuredOutputSchemaError(error: unknown): boolean;
  resolveBattleModel(model?: string): string;
};
