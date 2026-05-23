import {z} from "zod"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma";


const submitSchema = z.object({
    matchId: z.string(),
    role: z.enum(["host" , "guest"]), 
    language: z.string(),
    code: z.string()
})


export async function POST(request: Request){
    const payload = await request.json()
    const result = submitSchema.safeParse(payload)

    if (!result.success) {
    return NextResponse.json(
        { error: "Invalid submit payload", issues: result.error.flatten() },
        { status: 400 }
    );
    }

    const { matchId, role, language, code } = result.data;

    try {
    // 1. Fetch the problem for this match
    const problem = await prisma.problem.findUnique({
        where: { matchId },
    });

    if (!problem) {
        return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    // 2. Get test cases from rawJson
    const rawJson = problem.rawJson as {
        testCases: { input: string; expectedOutput: string; isHidden: boolean }[];
    };
    const testCases = rawJson.testCases ?? [];

    // 3. Run code against each test case
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const results = await Promise.all(
        testCases.map(async (tc) => {
        const res = await fetch(`${appUrl}/api/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language, code, stdin: tc.input }),
        });
        const data = await res.json();
        const actual = (data.stdout ?? "").trim();
        const expected = tc.expectedOutput.trim();
        return {
            input: tc.input,
            expected,
            actual,
            passed: actual === expected,
            isHidden: tc.isHidden,
        };
        })
    );

    // 4. Compute verdict
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const allPassed = passedTests === totalTests;
    const verdict = allPassed ? "AC" : "WA";

    // 5. Save submission
    const submission = await prisma.submission.create({
        data: {
        matchId,
        role,
        language,
        code,
        verdict,
        score: Math.round((passedTests / totalTests) * 100),
        outputJson: results as object[],
        },
    });

    return NextResponse.json({
        verdict,
        passedTests,
        totalTests,
        submission,
        results: results.filter((r) => !r.isHidden), // only return visible results
    });
    } catch (err) {
    console.error("[submit] error:", err);
    return NextResponse.json(
        { error: "Submission failed", detail: String(err) },
        { status: 500 }
    );
    }

}