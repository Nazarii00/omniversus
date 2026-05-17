import {
  createMiddlewarePipeline,
  withRequestContext,
} from "@/server/middleware";

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};

export const proxy = createMiddlewarePipeline([withRequestContext]);
