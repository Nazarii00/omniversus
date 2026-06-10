"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/server/supabase/server";
import { getPrisma } from "@/server/db/prisma";
import { withActionRateLimit } from "./withActionRateLimit";

async function _signInAction(
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

export const signInAction = withActionRateLimit("login", _signInAction);

async function _signUpAction(
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

export const signUpAction = withActionRateLimit("register", _signUpAction);

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
