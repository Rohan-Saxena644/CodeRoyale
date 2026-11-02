import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const headers = { "Cache-Control": "no-store" };
  try {
    const [totalMatches, activeMatches] = await Promise.race([
      Promise.all([
        prisma.match.count(),
        prisma.match.count({ where: { status: "active" } }),
      ]),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Database health check timed out")), 4000); }),
    ]);
    return NextResponse.json({
      ok: true,
      status: "operational",
      service: "coderoyale-web",
      timestamp: new Date().toISOString(),
      checks: { web: "operational", database: "operational" },
      totalMatches,
      activeMatches,
    }, { headers });
  } catch {
    // Keep the web liveness check successful while exposing dependency failures.
    return NextResponse.json({
      ok: true,
      status: "degraded",
      service: "coderoyale-web",
      timestamp: new Date().toISOString(),
      checks: { web: "operational", database: "unavailable" },
      totalMatches: null,
      activeMatches: null,
    }, { headers });
  } finally {
    clearTimeout(timeout);
  }
}
