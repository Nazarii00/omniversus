import { NextRequest, NextResponse } from "next/server";

import { buildBattleCacheKey, findCachedBattleResult } from "@/server/battle";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const fighterA = url.searchParams.get("fighterA")?.trim();
  const fighterB = url.searchParams.get("fighterB")?.trim();

  if (!fighterA || !fighterB) {
    return NextResponse.json(
      { error: "fighterA and fighterB query parameters are required" },
      { status: 400 },
    );
  }

  const cacheKey = buildBattleCacheKey(fighterA, fighterB);
  const cached = await findCachedBattleResult(cacheKey);

  return NextResponse.json({
    cached: cached !== null,
    battleRunId: cached?.battleRunId ?? null,
  });
}
