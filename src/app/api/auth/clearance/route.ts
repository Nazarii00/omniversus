import { NextResponse } from "next/server";

import { getPrisma } from "@/server/db/prisma";
import { createServerSupabaseClient } from "@/server/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ clearance: null, isAdmin: false });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ clearance: null, isAdmin: false });
    }

    const profile = await prisma.profile.findUnique({
      where: { supabaseId: user.id },
      select: { clearance: true },
    });

    const clearance = profile?.clearance ?? null;
    const isAdmin = clearance?.startsWith("SIGMA-5") ?? false;

    return NextResponse.json({ clearance, isAdmin });
  } catch {
    return NextResponse.json({ clearance: null, isAdmin: false });
  }
}
