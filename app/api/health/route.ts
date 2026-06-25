import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const [totalMatches, activeMatches] = await Promise.all([
      prisma.match.count(),
      prisma.match.count({ where: { status: "active" } }),
    ]);
    return NextResponse.json({
      ok: true,
      service: "coderoyale-web",
      timestamp: new Date().toISOString(),
      totalMatches,
      activeMatches,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      service: "coderoyale-web",
      timestamp: new Date().toISOString(),
      totalMatches: 0,
      activeMatches: 0,
    });
  }
}
