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
