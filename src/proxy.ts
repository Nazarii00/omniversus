import {
  createMiddlewarePipeline,
  withRequestContext,
} from "@/server/middleware";
import { supabaseSessionHandler } from "@/server/supabase/supabaseSessionHandler";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public/)
     */
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export const proxy = createMiddlewarePipeline([
  withRequestContext,
  supabaseSessionHandler,
]);
