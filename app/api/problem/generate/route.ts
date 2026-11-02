export const dynamic = "force-dynamic";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { problemSeeds } from "@/lib/problem-seeds";
import { publicProblem } from "@/lib/match-rules";
export const runtime = "nodejs";

const requestSchema = z.object({
  matchId: z.string().min(1),
});

export async function POST(request: Request) {
  const secret = process.env.INTERNAL_SECRET;
  if ((secret && request.headers.get("x-internal-secret") !== secret) || (!secret && process.env.NODE_ENV === "production")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const payload = await request.json().catch(() => null);
  const result = requestSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: result.error.flatten() },
      { status: 400 }
    );
  }

  const { matchId } = result.data;

  try {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const existing = await prisma.problem.findUnique({ where: { matchId } });
    if (existing) {
      return NextResponse.json({ problem: publicProblem(existing) });
    }

    const difficulty = match.difficulty as "easy" | "medium" | "hard";
    const matching = problemSeeds.filter((p) => p.difficulty === difficulty);
    const pool = matching.length > 0 ? matching : problemSeeds;
    const seed = pool[Math.floor(Math.random() * pool.length)];

    const problem = await prisma.problem.upsert({
      where: { matchId },
      update: {},
      create: {
        mode: "competitive",
        title: seed.title,
        prompt: seed.statement,
        difficulty: seed.difficulty,
        sourceKind: seed.sourceKind,
        generatorVersion: "seed-v1",
        rawJson: seed as object,
        matchId,
      },
    });

    return NextResponse.json({ problem: publicProblem(problem) });
  } catch (err) {
    console.error("[generate-problem] error:", err);
    return NextResponse.json(
      { error: "Problem generation failed" },
      { status: 500 }
    );
  }
}
