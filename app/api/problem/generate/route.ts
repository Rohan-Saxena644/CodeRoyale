export const dynamic = "force-dynamic";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { problemSeeds } from "@/lib/problem-seeds";
export const runtime = "nodejs";

const requestSchema = z.object({
  matchId: z.string().min(1),
});

export async function POST(request: Request) {
  const payload = await request.json();
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
      return NextResponse.json({ problem: existing });
    }

    const difficulty = match.difficulty as "easy" | "medium" | "hard";
    const matching = problemSeeds.filter((p) => p.difficulty === difficulty);
    const pool = matching.length > 0 ? matching : problemSeeds;
    const seed = pool[Math.floor(Math.random() * pool.length)];

    const problem = await prisma.problem.create({
      data: {
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

    return NextResponse.json({ problem });
  } catch (err) {
    console.error("[generate-problem] error:", err);
    return NextResponse.json(
      { error: "Problem generation failed", detail: String(err) },
      { status: 500 }
    );
  }
}
