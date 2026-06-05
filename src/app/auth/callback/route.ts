import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/server/supabase";
import { getPrisma } from "@/server/db/prisma";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Create profile for new OAuth users if it doesn't exist
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const prisma = getPrisma();
        if (prisma) {
          const existing = await prisma.profile.findUnique({
            where: { supabaseId: user.id },
          });

          if (!existing) {
            const username =
              user.user_metadata?.username ??
              user.user_metadata?.full_name ??
              user.email?.split("@")[0] ??
              "user";

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (prisma.profile as any).create({
              data: {
                supabaseId: user.id,
                username,
                clearance: "SIGMA-1",
                reputation: 0,
                credits: 100,
              },
            });
          }
        }
      }

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(new URL("/login?error=oauth_failed", origin));
}
