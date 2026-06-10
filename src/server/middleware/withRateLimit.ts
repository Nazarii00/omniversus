import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import {
  AUTHENTICATED_BATTLE_LIMIT,
  RATE_LIMITS_BY_SCOPE,
  RATE_LIMIT_OVERRIDES,
  type RateLimitScope,
} from "./rateLimitConfig";
import type { MiddlewareContext, MiddlewareHandler } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEnabled(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function extractIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  // In Edge middleware request.ip is available (Next.js 13.1+)
  return (request as NextRequest & { ip?: string }).ip ?? "127.0.0.1";
}

function hasSession(request: NextRequest): boolean {
  // Supabase stores auth tokens in cookies prefixed with sb-
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
}

function resolveScope(
  request: NextRequest,
  context: MiddlewareContext,
): {
  scope: string;
  limit: RateLimitScope;
  bucket: string;
} {
  const pathname = request.nextUrl.pathname;

  // Check overrides first (longest-prefix match)
  for (const [prefix, limit] of Object.entries(RATE_LIMIT_OVERRIDES)) {
    if (pathname.startsWith(prefix)) {
      const isAuthenticated = prefix === "/api/battle" && hasSession(request);
      const effectiveLimit = isAuthenticated
        ? AUTHENTICATED_BATTLE_LIMIT
        : limit;
      const authSuffix = isAuthenticated ? ":auth" : ":anon";

      return {
        scope: prefix,
        limit: effectiveLimit,
        bucket: `${prefix}${authSuffix}`,
      };
    }
  }

  // Fall back to scope-based limit
  const scopeLimit = RATE_LIMITS_BY_SCOPE[context.routeScope];

  return {
    scope: context.routeScope,
    limit: scopeLimit,
    bucket: context.routeScope,
  };
}

function rateLimitHeaders(ratelimitResult: {
  limit: number;
  remaining: number;
  reset: number;
}): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(ratelimitResult.limit),
    "X-RateLimit-Remaining": String(ratelimitResult.remaining),
    "X-RateLimit-Reset": String(ratelimitResult.reset),
  };
}

// ---------------------------------------------------------------------------
// Ratelimit instances (lazily initialised)
// ---------------------------------------------------------------------------

let _redis: Redis | null = null;
const _limiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (!isEnabled()) return null;
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

function getLimiter(scope: RateLimitScope): Ratelimit {
  const key = `${scope.limit}:${scope.windowSeconds}`;
  let limiter = _limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis()!,
      limiter: Ratelimit.slidingWindow(scope.limit, `${scope.windowSeconds} s`),
      analytics: true,
      prefix: "omniversus:rl",
    });
    _limiters.set(key, limiter);
  }
  return limiter;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const withRateLimit: MiddlewareHandler = async (
  request: NextRequest,
  context: MiddlewareContext,
) => {
  if (!isEnabled()) return null;

  const ip = extractIp(request);
  const { bucket, limit: limitConfig, scope } = resolveScope(request, context);
  const limiter = getLimiter(limitConfig);
  const identifier = `${ip}:${bucket}`;

  const result = await limiter.limit(identifier);

  const headers = rateLimitHeaders(result);

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: "rate_limit_exceeded",
        scope,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  // Attach rate-limit info to response headers so the client can track usage
  for (const [key, value] of Object.entries(headers)) {
    context.responseHeaders.set(key, value);
  }

  return null;
};
