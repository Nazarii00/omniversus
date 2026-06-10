import { createServerSupabaseClient } from "@/server/supabase/server";

interface AuthenticatedUser {
  id: string;
  email: string | undefined;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  // DEVELOPMENT BYPASS — skip Supabase auth, return fake user for local UI testing
  if (process.env.NODE_ENV === "development") {
    return {
      id: "dev-user-000",
      email: "dev@arena.local",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
  };
}
