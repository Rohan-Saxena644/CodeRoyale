export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDriver, languageIds, runOnJudge0 } from "@/lib/judge";

const submitSchema = z.object({
  matchId: z.string(),
  role: z.enum(["host", "guest"]),
  language: z.string(),
  code: z.string().max(50000),
});

const submitRateLimit = new Map<string, number[]>();

function checkSubmitRateLimit(key: string): boolean {
  const now = Date.now();
  const window = 60_000;
  const limit = 5;
  const timestamps = (submitRateLimit.get(key) ?? []).filter((t) => now - t < window);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  submitRateLimit.set(key, timestamps);
  return true;
}

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

const RUN_RETRY_DELAYS_MS = [800, 1600];

async function runOneTest(payload: RunPayload): Promise<RunOutcome> {
  const languageId = languageIds[payload.language];
  if (!languageId) {
    return { actual: "", runError: `Unsupported language: ${payload.language}` };
  }

  const { code: fullCode, stdin } = buildDriver(
    payload.language,
    payload.code,
    payload.functionName,
    payload.args,
    payload.params
  );

  for (let attempt = 0; attempt <= RUN_RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RUN_RETRY_DELAYS_MS[attempt - 1]);
    const isLastAttempt = attempt === RUN_RETRY_DELAYS_MS.length;

    const { data, error } = await runOnJudge0(fullCode, languageId, stdin);

    if (error || !data) {
      if (!isLastAttempt) continue;
      return { actual: "", runError: `Judge error: ${error ?? "unknown"}`, isJudgeError: true };
    }

    if (!data.stdout && (data.stderr || data.compile_output)) {
      return {
        actual: "",
        runError: String(data.stderr ?? data.compile_output ?? "").slice(0, 200),
      };
    }

    return { actual: (data.stdout ?? "").trim() };
  }

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

  const rateLimitKey = `${matchId}:${role}`;
  if (!checkSubmitRateLimit(rateLimitKey)) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait before submitting again." },
      { status: 429 }
    );
  }

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

      if (i > 0) await sleep(600);

      const { actual, runError, isJudgeError } = await runOneTest({
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
