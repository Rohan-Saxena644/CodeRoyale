export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDriver, executionError, languageIds, outputsMatch, runOnJudge0 } from "@/lib/judge";

const submitSchema = z.object({
  matchId: z.string().min(1).max(64),
  role: z.enum(["host", "guest"]),
  language: z.enum(["javascript", "python", "cpp", "go", "rust", "java"]),
  code: z.string().min(1).max(50000),
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
    payload.params,
    payload.returnType
  );

  const { data, error } = await runOnJudge0(fullCode, languageId, stdin);
  if (error || !data) {
    return { actual: "", runError: `Judge error: ${error ?? "unknown"}`, isJudgeError: true };
  }
  const failure = executionError(data);
  return failure ? { actual: "", runError: failure } : { actual: (data.stdout ?? "").trim() };
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const result = submitSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid submit payload" }, { status: 400 });
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
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { status: true, hostName: true, guestName: true, winnerRole: true },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if (match.status === "finished") {
      return NextResponse.json({ error: "Match has already ended" }, { status: 409 });
    }

    if (match.winnerRole) {
      return NextResponse.json({ error: "Match has already ended" }, { status: 409 });
    }

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

      if (isJudgeError) {
        return NextResponse.json({ error: "The grading service could not complete this submission. Please try again.", hasJudgeErrors: true }, { status: 502 });
      }

      const expected = JSON.stringify(tc.expectedOutput);
      const passed = !runError && outputsMatch(actual, tc.expectedOutput);

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
    const allPassed = totalTests > 0 && passedTests === totalTests;
    const verdict = allPassed ? "AC" : "WA";
    const hasJudgeErrors = runResults.some((r) => r.isJudgeError);

    if (hasJudgeErrors) {
      return NextResponse.json({ error: "The grading service could not complete this submission. Please try again.", hasJudgeErrors: true }, { status: 502 });
    }

    const submission = await prisma.submission.create({
      data: {
        matchId,
        role,
        language,
        code,
        verdict,
        score: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
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

        const secret = process.env.INTERNAL_SECRET ?? "";

        try {
          await fetch(`${socketUrl}/internal/match-ended`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(secret ? { "x-internal-secret": secret } : {}),
            },
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
      submission: { id: submission.id, verdict: submission.verdict, score: submission.score },
      results: runResults.filter((r) => !r.isHidden),
    });
  } catch (err) {
    console.error("[submit] error:", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
