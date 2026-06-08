# Middleware Module

`src/proxy.ts` is the Next.js request-interception entry point. Keep it thin
and compose handlers from this folder.

## Pipeline order

```
withRequestContext → supabaseSessionHandler → withRateLimit
```

`withRateLimit` runs **after** the session handler so it can differentiate
authenticated users (larger limits) from anonymous traffic.

## Handlers

| Handler | Purpose |
|---|---|
| `withRequestContext` | Adds `x-omniversus-request-id` and `x-omniversus-route-scope` |
| `supabaseSessionHandler` | Refreshes Supabase auth cookies |
| `withRateLimit` | Sliding-window rate limiting via Upstash Redis (`@upstash/ratelimit`) |

## Rate limiting

Configured in `rateLimitConfig.ts`. Limits are per-IP, with separate buckets
for route scopes (`api` / `admin` / `app`) and special overrides for
`/api/battle`.

Authenticated users on `/api/battle` get a larger window (20 req/60s vs 5 req/60s
for anonymous traffic). When `UPSTASH_REDIS_REST_URL` is not set the handler is
a no-op.

On limit exceeded the handler returns `429 Too Many Requests` with
`Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
`X-RateLimit-Reset` headers.

## Server Actions

`withActionRateLimit` in `src/features/user-account/actions/` wraps
`signInAction` and `signUpAction` with the same Upstash-backed sliding window
(5 req/60s for login, 3 req/60s for registration).

## Per-user daily cap

`POST /api/battle` additionally enforces a daily battle-run budget via
Prisma:

- Regular users: **50 battle runs / 24 hours**
- Admins (`SIGMA-5`+ clearance): **200 battle runs / 24 hours**

Exceeding the daily cap returns `429` with `Retry-After` set to the
remaining time in the 24-hour window.
