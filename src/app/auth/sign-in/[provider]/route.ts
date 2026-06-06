import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/server/supabase";

const ALLOWED_PROVIDERS = ["google", "discord", "twitter"] as const;
type Provider = (typeof ALLOWED_PROVIDERS)[number];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!ALLOWED_PROVIDERS.includes(provider as Provider)) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_provider", request.url),
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";

  const redirectTo = new URL("/auth/callback", siteUrl);

  // Preserve 'next' param if present
  const nextParam = request.nextUrl.searchParams.get("next");
  if (nextParam) {
    redirectTo.searchParams.set("next", nextParam);
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo: redirectTo.toString(),
    },
  });

  if (error) {
    console.error(`[OAuth Route] ${provider} sign in error:`, error.message);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, siteUrl),
    );
  }

  if (data.url) {
    return NextResponse.redirect(data.url);
  }

  return NextResponse.redirect(
    new URL("/login?error=no_redirect_url", siteUrl),
  );
}
