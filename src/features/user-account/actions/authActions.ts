"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/server/supabase/server";
import { getPrisma } from "@/server/db/prisma";

export async function signInAction(
  _prevState: { error: string | null },
  formData: FormData,
) {
  const supabase = await createServerSupabaseClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/account");
}

export async function signUpAction(
  _prevState: { error: string | null },
  formData: FormData,
) {
  const supabase = await createServerSupabaseClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Create profile immediately after signup
  if (data.user) {
    const prisma = getPrisma();
    if (prisma) {
      const existing = await prisma.profile.findUnique({
        where: { supabaseId: data.user.id },
      });

      if (!existing) {
        await prisma.profile.create({
          data: {
            supabaseId: data.user.id,
            username,
            clearance: "SIGMA-1",
            reputation: 0,
            credits: 100,
          },
        });
      }
    }
  }

  revalidatePath("/", "layout");
  redirect("/account");
}

export async function signInWithProviderAction(
  provider: "google" | "discord" | "twitter",
): Promise<{ error: string | null; url?: string }> {
  const supabase = await createServerSupabaseClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectTo = `${siteUrl}/auth/callback`;

  console.log(`[OAuth] Starting ${provider} sign in, redirectTo:`, redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error(`[OAuth] ${provider} sign in error:`, error.message);
    return { error: error.message };
  }

  console.log(`[OAuth] ${provider} got URL:`, data.url);

  if (data.url) {
    return { error: null, url: data.url };
  }

  return { error: "No redirect URL returned" };
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
