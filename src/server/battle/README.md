# Battle Server Module

`index.ts` is the public server API for battle analysis. Route handlers and
other app code should import from `@/server/battle` instead of reaching into
internal folders.

- `config/` contains pinned runtime settings such as the active model.
- `domain/` contains app-owned schemas, types, and validation.
- `pipeline/` contains model-output coercion, mapping, and normalization.
- `prompts/` contains prompt builders and system prompt text.
- `providers/` contains external model/provider adapters.

Keep provider-specific response shapes in `providers/*`; keep app-facing result
contracts in `domain/`.

## AI providers

The battle pipeline selects its model provider through `resolveBattleProvider`.
Keep provider authentication, base URLs, and model-id normalization inside
`providers/*`; route handlers and UI code should only call `@/server/battle`.

- `BATTLE_AI_PROVIDER=gemini` uses the Gemini API OpenAI-compatible endpoint and
  `GEMINI_API_KEY`.
- `BATTLE_AI_PROVIDER=vertex-ai` uses Vertex AI's OpenAI-compatible endpoint,
  Google Application Default Credentials, `VERTEX_PROJECT_ID`,
  `VERTEX_LOCATION`, and `VERTEX_MODEL`.

Vertex model ids are normalized for the OpenAI-compatible endpoint, so
`gemini-3.5-flash` becomes `google/gemini-3.5-flash`.
