# Middleware Module

`src/proxy.ts` is the Next.js request-interception entry point. Keep it thin
and compose handlers from this folder.

- Handlers should stay Edge-safe: do not import Prisma, provider clients, or
  other Node-only modules here.
- Use `createMiddlewarePipeline` to add auth, admin guards, rate limiting, or
  request logging without turning the root middleware file into a large switch.
- Shared request context currently adds `x-omniversus-request-id` and
  `x-omniversus-route-scope` headers for downstream route handlers.
