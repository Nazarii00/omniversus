import type { NextFetchEvent, NextRequest } from "next/server";

export type MiddlewareRouteScope = "admin" | "api" | "app";

export type MiddlewareContext = {
  event: NextFetchEvent;
  requestHeaders: Headers;
  responseHeaders: Headers;
  routeScope: MiddlewareRouteScope;
};

export type MiddlewareResult = Response | null | undefined;

export type MiddlewareHandler = (
  request: NextRequest,
  context: MiddlewareContext,
) => MiddlewareResult | Promise<MiddlewareResult>;
