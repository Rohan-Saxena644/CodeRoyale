export const dynamic = "force-dynamic";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";

const submitSchema = z.object({
  matchId: z.string(),
  role: z.enum(["host", "guest"]),
  language: z.string(),
  code: z.string(),
});

// Small delay helper — gives Judge0 CE breathing room between requests
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
        returnType?: string;
      };
      testCases: { args: unknown[]; expectedOutput: unknown; isHidden: boolean }[];
    };

    const testCases = rawJson.testCases ?? [];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // ── Run test cases SEQUENTIALLY ──────────────────────────────────────────
    // Judge0 CE (free public instance) rate-limits concurrent requests.
    // Promise.all caused all 4 to fire at once → some got throttled → null stdout
    // → "WA" even for correct code. Sequential with a small gap fixes this.
    const runResults: {
      input: string;
      expected: string;
      actual: string;
      passed: boolean;
      isHidden: boolean;
      error?: string;
    }[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];

      // Small gap between requests to stay within Judge0 CE rate limits
      if (i > 0) await sleep(300);

      let actual = "";
      let runError: string | undefined;

      try {
        const res = await fetch(`${appUrl}/api/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language,
            code,
            functionName: rawJson.functionSignature.name,
            args: tc.args,
            params: rawJson.functionSignature.params,
            returnType: rawJson.functionSignature.returnType,
          }),
        });

        if (!res.ok) {
          runError = `Run API returned ${res.status}`;
        } else {
          const data = await res.json();
          if (data.error) {
            runError = data.error;
          } else if (!data.stdout && data.stderr) {
            // Compile error or runtime error — stderr has the message
            runError = data.stderr.slice(0, 200);
          } else {
            actual = (data.stdout ?? "").trim();
          }
        }
      } catch (err) {
        runError = `Network error: ${String(err)}`;
      }

      const expected = JSON.stringify(tc.expectedOutput);
      const passed = !runError && actual === expected;

      runResults.push({
        input: JSON.stringify(tc.args),
        expected,
        actual,
        passed,
        isHidden: tc.isHidden,
        ...(runError ? { error: runError } : {}),
      });
    }

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

        const socketUrl =
          process.env.SOCKET_SERVER_URL ??
          process.env.NEXT_PUBLIC_SOCKET_URL ??
          "http://localhost:4000";

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