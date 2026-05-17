import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";

import { resolveRouteScope } from "./routes";
import type { MiddlewareContext, MiddlewareHandler } from "./types";

function applyResponseHeaders(response: Response, headers: Headers): Response {
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

export function createMiddlewarePipeline(
  handlers: readonly MiddlewareHandler[],
) {
  return async function middleware(
    request: NextRequest,
    event: NextFetchEvent,
  ) {
    const context: MiddlewareContext = {
      event,
      requestHeaders: new Headers(request.headers),
      responseHeaders: new Headers(),
      routeScope: resolveRouteScope(request.nextUrl.pathname),
    };

    for (const handler of handlers) {
      const response = await handler(request, context);
      if (response) {
        return applyResponseHeaders(response, context.responseHeaders);
      }
    }

    const response = NextResponse.next({
      request: {
        headers: context.requestHeaders,
      },
    });

    return applyResponseHeaders(response, context.responseHeaders);
  };
}
