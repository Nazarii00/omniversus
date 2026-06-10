import type { MiddlewareRouteScope } from "./types";

export interface RateLimitScope {
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Window duration in seconds. */
  windowSeconds: number;
}

/**
 * Rate limit configuration keyed by route scope.
 *
 * - `api` — generic API endpoints (appeals, subject-requests, etc.)
 * - `admin` — admin panel routes
 * - `app` — regular page requests
 */
export const RATE_LIMITS_BY_SCOPE: Record<
  MiddlewareRouteScope,
  RateLimitScope
> = {
  api: { limit: 30, windowSeconds: 60 },
  admin: { limit: 60, windowSeconds: 60 },
  app: { limit: 120, windowSeconds: 60 },
};

/**
 * Specialised limits for specific API sub-routes (checked by path prefix).
 * Keys are path prefixes relative to the route scope.
 */
export const RATE_LIMIT_OVERRIDES: Record<string, RateLimitScope> = {
  "/api/battle": { limit: 5, windowSeconds: 60 },
};

/** Larger limit applied to authenticated users on battle endpoints. */
export const AUTHENTICATED_BATTLE_LIMIT: RateLimitScope = {
  limit: 20,
  windowSeconds: 60,
};
