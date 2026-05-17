import type { NextRequest } from "next/server";

import { REQUEST_ID_HEADER, ROUTE_SCOPE_HEADER } from "./routes";
import type { MiddlewareContext, MiddlewareResult } from "./types";

function createRequestId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

export function withRequestContext(
  _request: NextRequest,
  context: MiddlewareContext,
): MiddlewareResult {
  const requestId =
    context.requestHeaders.get(REQUEST_ID_HEADER) ?? createRequestId();

  context.requestHeaders.set(REQUEST_ID_HEADER, requestId);
  context.requestHeaders.set(ROUTE_SCOPE_HEADER, context.routeScope);
  context.responseHeaders.set(REQUEST_ID_HEADER, requestId);

  return null;
}
