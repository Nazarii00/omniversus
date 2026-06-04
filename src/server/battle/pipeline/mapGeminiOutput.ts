import { prepareBattleOutput } from "./prepareBattleOutput";
import type { GeminiBattleOutput } from "../providers/gemini/outputSchema";
import {
  OmniversusBattleSchema,
  type OmniversusBattle,
} from "../domain/schema";
import { normalizeBattleResult } from "./normalize";

export function mapGeminiBattleOutput(
  raw: GeminiBattleOutput,
  fighterAName: string,
  fighterBName: string,
): OmniversusBattle {
  const prepared = prepareBattleOutput(raw, {
    fighterA: fighterAName,
    fighterB: fighterBName,
  });
  const parsed = OmniversusBattleSchema.safeParse(prepared);

  if (!parsed.success) {
    throw new Error(
      `Gemini battle output contract mapping failed: ${parsed.error.message}`,
    );
  }

  const normalized = normalizeBattleResult(parsed.data);
  const normalizedParsed = OmniversusBattleSchema.safeParse(normalized);

  if (!normalizedParsed.success) {
    throw new Error(
      `Gemini battle output semantic mapping failed: ${normalizedParsed.error.message}`,
    );
  }

  return normalizedParsed.data;
}
