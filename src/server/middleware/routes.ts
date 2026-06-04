import type { MiddlewareRouteScope } from "./types";

export const REQUEST_ID_HEADER = "x-omniversus-request-id";
export const ROUTE_SCOPE_HEADER = "x-omniversus-route-scope";

function isPathWithin(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function resolveRouteScope(pathname: string): MiddlewareRouteScope {
  if (isPathWithin(pathname, "/admin")) return "admin";
  if (isPathWithin(pathname, "/api")) return "api";

  return "app";
}
