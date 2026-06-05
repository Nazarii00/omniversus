import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/server/supabase";
import { getPrisma } from "@/server/db/prisma";

export async function GET(request: NextRequest) {
  const { searchParams, origin, href } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/account";

  console.log("[OAuth Callback] Full URL:", href);
  console.log("[OAuth Callback] Params:", {
    code: code ? `${code.substring(0, 20)}...` : null,
    error: errorParam,
    error_code: errorCode,
    error_description: errorDescription,
    next,
  });

  if (errorParam) {
    console.error(
      `[OAuth Callback] Error from provider: ${errorParam} (${errorCode}) — ${errorDescription}`,
    );
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const prisma = getPrisma();
        if (!prisma) {
          console.error(
            "[OAuth Callback] Prisma client not available — profile not created for user:",
            user.id,
          );
        } else {
          try {
            const existing = await prisma.profile.findUnique({
              where: { supabaseId: user.id },
            });

            if (!existing) {
              const username =
                user.user_metadata?.username ??
                user.user_metadata?.full_name ??
                user.email?.split("@")[0] ??
                "user";

              await prisma.profile.create({
                data: {
                  supabaseId: user.id,
                  username,
                  clearance: "SIGMA-1",
                  reputation: 0,
                  credits: 100,
                },
              });

              console.log(
                "[OAuth Callback] Profile created for user:",
                user.id,
                "username:",
                username,
              );
            } else {
              console.log(
                "[OAuth Callback] Profile already exists for user:",
                user.id,
              );
            }
          } catch (err) {
            console.error(
              "[OAuth Callback] Failed to create profile for user:",
              user.id,
              err,
            );
          }
        }
      }

      return NextResponse.redirect(new URL(next, origin));
    }

    console.error(
      "[OAuth Callback] exchangeCodeForSession error:",
      error.message,
    );
  }

  return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
}
