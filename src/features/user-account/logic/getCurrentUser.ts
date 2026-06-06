import { createServerSupabaseClient } from "@/server/supabase/server";

interface AuthenticatedUser {
  id: string;
  email: string | undefined;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
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
