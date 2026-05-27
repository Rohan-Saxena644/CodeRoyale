export const dynamic = "force-dynamic";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const submitSchema = z.object({
  matchId: z.string(),
  role: z.enum(["host", "guest"]),
  language: z.string(),
  code: z.string(),
});

export async function POST(request: Request) {
  const payload = await request.json();
  const result = submitSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid submit payload", issues: result.error.flatten() },
      { status: 400 }
    );
  }

  const { matchId, role, language, code } = result.data;

  try {
    const problem = await prisma.problem.findUnique({ where: { matchId } });
    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    const rawJson = problem.rawJson as {
      functionSignature: {
        name: string;
        params: { name: string; type: string }[];
      };
      testCases: { args: unknown[]; expectedOutput: unknown; isHidden: boolean }[];
    };

    const testCases = rawJson.testCases ?? [];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const runResults = await Promise.all(
      testCases.map(async (tc) => {
        const res = await fetch(`${appUrl}/api/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language,
            code,
            functionName: rawJson.functionSignature.name,
            args: tc.args,
            params: rawJson.functionSignature.params,
          }),
        });
        const data = await res.json();
        const actual = (data.stdout ?? "").trim();
        const expected = JSON.stringify(tc.expectedOutput);
        return {
          input: JSON.stringify(tc.args),
          expected,
          actual,
          passed: actual === expected,
          isHidden: tc.isHidden,
        };
      })
    );

    const totalTests = runResults.length;
    const passedTests = runResults.filter((r) => r.passed).length;
    const allPassed = passedTests === totalTests;
    const verdict = allPassed ? "AC" : "WA";

    const submission = await prisma.submission.create({
      data: {
        matchId,
        role,
        language,
        code,
        verdict,
        score: Math.round((passedTests / totalTests) * 100),
        outputJson: runResults as object[],
      },
    });

    if (allPassed) {
      const existingWinner = await prisma.match.findUnique({
        where: { id: matchId },
        select: { winnerRole: true },
      });

      if (!existingWinner?.winnerRole) {
        await prisma.match.update({
          where: { id: matchId },
          data: { winnerRole: role, status: "finished" },
        });

        const socketUrl = process.env.SOCKET_SERVER_URL ?? "http://localhost:4000";
        try {
          await fetch(`${socketUrl}/internal/match-ended`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomId: matchId, winnerRole: role }),
          });
        } catch (err) {
          console.warn("[submit] could not notify socket server:", err);
        }
      }
    }

    return NextResponse.json({
      verdict,
      passedTests,
      totalTests,
      submission,
      results: runResults.filter((r) => !r.isHidden),
    });
  } catch (err) {
    console.error("[submit] error:", err);
    return NextResponse.json(
      { error: "Submission failed", detail: String(err) },
      { status: 500 }
    );
  }
}
