import { coerceBattleDraft } from "./coerce";
import type { GeminiBattleOutput } from "./geminiSchema";
import { OmniversusBattleSchema, type OmniversusBattle } from "./schema";

export function mapGeminiBattleOutput(
  raw: GeminiBattleOutput,
  fighterAName: string,
  fighterBName: string,
): OmniversusBattle {
  const coerced = coerceBattleDraft(raw, {
    fighterA: fighterAName,
    fighterB: fighterBName,
  });
  const parsed = OmniversusBattleSchema.safeParse(coerced);

  if (!parsed.success) {
    throw new Error(
      `Gemini battle output mapping failed: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}
