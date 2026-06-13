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

type RunPayload = {
  language: string;
  code: string;
  functionName: string;
  args: unknown[];
  params: { name: string; type: string }[];
  returnType?: string;
};

type RunOutcome = {
  actual: string;
  runError?: string;
  isJudgeError?: boolean;
};

// Extra attempts (with backoff) if /api/run itself reports a judge/infra
// failure (Judge0 unreachable, rate-limited, etc.) — as opposed to a
// compile error or thrown exception in the user's own code, which is a
// real result and should NOT be retried.
const RUN_RETRY_DELAYS_MS = [800, 1600];

async function runOneTest(appUrl: string, payload: RunPayload): Promise<RunOutcome> {
  for (let attempt = 0; attempt <= RUN_RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RUN_RETRY_DELAYS_MS[attempt - 1]);
    const isLastAttempt = attempt === RUN_RETRY_DELAYS_MS.length;

    try {
      const res = await fetch(`${appUrl}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // /api/run returns 502 when Judge0 is unreachable/rate-limited even
        // after its own internal retries — that's an infra issue, retry here.
        if (!isLastAttempt) continue;
        return { actual: "", runError: `Run API returned ${res.status}`, isJudgeError: true };
      }

      const data = await res.json();

      if (data.error) {
        if (!isLastAttempt) continue;
        return { actual: "", runError: data.error, isJudgeError: true };
      }

      if (!data.stdout && data.stderr) {
        // Compile error or thrown exception in the USER's code — a real
        // result, not a judge issue, so don't retry.
        return { actual: "", runError: String(data.stderr).slice(0, 200) };
      }

      return { actual: (data.stdout ?? "").trim() };
    } catch (err) {
      if (!isLastAttempt) continue;
      return { actual: "", runError: `Network error: ${String(err)}`, isJudgeError: true };
    }
  }

  // Unreachable, but keeps TypeScript happy.
  return { actual: "", runError: "Run failed after retries", isJudgeError: true };
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
    // → "WA" even for correct code. Sequential with a gap, plus retries inside
    // runOneTest for judge/infra failures, fixes this.
    const runResults: {
      input: string;
      expected: string;
      actual: string;
      passed: boolean;
      isHidden: boolean;
      error?: string;
      isJudgeError?: boolean;
    }[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];

      // Gap between requests to stay within Judge0 CE rate limits
      if (i > 0) await sleep(600);

      const { actual, runError, isJudgeError } = await runOneTest(appUrl, {
        language,
        code,
        functionName: rawJson.functionSignature.name,
        args: tc.args,
        params: rawJson.functionSignature.params,
        returnType: rawJson.functionSignature.returnType,
      });

      const expected = JSON.stringify(tc.expectedOutput);
      const passed = !runError && actual === expected;

      runResults.push({
        input: JSON.stringify(tc.args),
        expected,
        actual,
        passed,
        isHidden: tc.isHidden,
        ...(runError ? { error: runError } : {}),
        ...(isJudgeError ? { isJudgeError: true } : {}),
      });
    }

    const totalTests = runResults.length;
    const passedTests = runResults.filter((r) => r.passed).length;
    const allPassed = passedTests === totalTests;
    const verdict = allPassed ? "AC" : "WA";
    // True if ANY test (including hidden ones) failed because the judge
    // itself had trouble — not because the code produced a wrong answer.
    // Surfaced to the client so a 0/N result doesn't look like "your code
    // is wrong" when it's actually "the grading service is having issues".
    const hasJudgeErrors = runResults.some((r) => r.isJudgeError);

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
      hasJudgeErrors,
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
