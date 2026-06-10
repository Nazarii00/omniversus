import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

type ActionScope = "login" | "register" | "feedback";

const LIMITS: Record<ActionScope, { limit: number; windowSeconds: number }> = {
  login: { limit: 5, windowSeconds: 60 },
  register: { limit: 3, windowSeconds: 60 },
  feedback: { limit: 20, windowSeconds: 60 },
};

// ---------------------------------------------------------------------------
// Ratelimit instances
// ---------------------------------------------------------------------------

let _redis: Redis | null = null;
const _limiters = new Map<string, Ratelimit>();

function isEnabled(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

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

function getLimiter(scope: ActionScope): Ratelimit {
  const cfg = LIMITS[scope];
  const key = `action:${scope}:${cfg.limit}:${cfg.windowSeconds}`;
  let limiter = _limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis()!,
      limiter: Ratelimit.slidingWindow(cfg.limit, `${cfg.windowSeconds} s`),
      analytics: true,
      prefix: "omniversus:rl:action",
    });
    _limiters.set(key, limiter);
  }
  return limiter;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function extractIp(): Promise<string> {
  const headersList = await headers();
  const xff = headersList.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return "127.0.0.1";
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

/**
 * Wraps a Server Action with rate limiting.
 *
 * When the limit is exceeded the action returns `{ error: "rate_limit_exceeded",
 * retryAfter: N }` instead of executing. The caller should check for this error
 * shape and display an appropriate message.
 */
export function withActionRateLimit<TArgs extends unknown[], TResult>(
  scope: ActionScope,
  action: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    if (!isEnabled()) return action(...args);

    const ip = await extractIp();
    const limiter = getLimiter(scope);
    const result = await limiter.limit(`${ip}:${scope}`);

    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

      return {
        error: "rate_limit_exceeded",
        retryAfter,
      } as TResult;
    }

    return action(...args);
  };
}
