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

  console.log("[OAuth Callback] ================================");
  console.log("[OAuth Callback] Full URL:", href);
  console.log(
    "[OAuth Callback] All search params:",
    Object.fromEntries(searchParams),
  );
  console.log(
    "[OAuth Callback] Request cookies:",
    request.cookies.getAll().map((c) => c.name),
  );

  if (errorParam) {
    console.error(
      `[OAuth Callback] Error from provider: ${errorParam} (${errorCode}) — ${errorDescription}`,
    );
    return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
  }

  if (!code) {
    console.error("[OAuth Callback] No code received in callback");
    return NextResponse.redirect(new URL("/login?error=oauth_no_code", origin));
  }

  const supabase = await createServerSupabaseClient();

  // First check if middleware already refreshed the session (PKCE flow)
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();

  if (existingUser) {
    console.log(
      "[OAuth Callback] Session already exists (middleware/PKCE set it):",
      existingUser.email,
    );

    // Ensure profile exists even when session was set by middleware
    const prisma = getPrisma();
    if (prisma) {
      try {
        const existing = await prisma.profile.findUnique({
          where: { supabaseId: existingUser.id },
        });
        if (!existing) {
          const username =
            existingUser.user_metadata?.username ??
            existingUser.user_metadata?.full_name ??
            existingUser.email?.split("@")[0] ??
            "user";
          await prisma.profile.create({
            data: {
              supabaseId: existingUser.id,
              username,
              clearance: "SIGMA-1",
              reputation: 0,
              credits: 100,
            },
          });
          console.log(
            "[OAuth Callback] Profile created for existing session user:",
            existingUser.id,
          );
        }
      } catch (err) {
        console.error("[OAuth Callback] Failed to create profile:", err);
      }
    }

    const response = NextResponse.redirect(new URL(next, origin));
    return response;
  }

  // No existing session — exchange code for session
  console.log("[OAuth Callback] No existing session, exchanging code...");
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error(
      "[OAuth Callback] exchangeCodeForSession error:",
      error.message,
      error,
    );
    return NextResponse.redirect(
      new URL("/login?error=oauth_exchange_failed", origin),
    );
  }

  // Get user after exchange
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    console.log("[OAuth Callback] User authenticated:", user.email);

    const prisma = getPrisma();
    if (prisma) {
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
        console.error("[OAuth Callback] Failed to create profile:", err);
      }
    }
  }

  const response = NextResponse.redirect(new URL(next, origin));
  return response;
}
