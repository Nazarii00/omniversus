import { NextRequest, NextResponse } from "next/server";

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
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 500 },
      );
    }

    const profile = await prisma.profile.findUnique({
      where: { supabaseId: user.id },
      select: { credits: true, reputation: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[profile-wallet] error", error);
    return NextResponse.json(
      { error: "Failed to load wallet" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const credits =
      typeof body.credits === "number" && Number.isFinite(body.credits)
        ? Math.max(0, Math.floor(body.credits as number))
        : undefined;
    const reputation =
      typeof body.reputation === "number" && Number.isFinite(body.reputation)
        ? Math.max(0, Math.floor(body.reputation as number))
        : undefined;

    if (credits === undefined && reputation === undefined) {
      return NextResponse.json(
        { error: "credits or reputation is required" },
        { status: 400 },
      );
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 500 },
      );
    }

    const updateData: Record<string, number> = {};
    if (credits !== undefined) updateData.credits = credits;
    if (reputation !== undefined) updateData.reputation = reputation;

    const profile = await prisma.profile.update({
      where: { supabaseId: user.id },
      data: updateData,
      select: { credits: true, reputation: true },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[profile-wallet] error", error);
    return NextResponse.json(
      { error: "Failed to update wallet" },
      { status: 500 },
    );
  }
}
