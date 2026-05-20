import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { competitiveProblemSchema } from "@/lib/problem-schemas";




import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


const problemSchema = z.object({
  matchId: z.string().min(1),
//   mode: z.enum(["competitive", "dev"]),
//   difficulty: z.enum(["easy", "medium", "hard"]),
//   track: z.string().min(1),
});


function buildPrompt(difficulty: string, track: string): string {
  return `You are a competitive programming problem author.
Generate a coding problem as a JSON object.

Requirements:
- difficulty: "${difficulty}"
- language: "${track}"
- Solvable in under 30 minutes
- At least 2 visible examples
- At least 4 test cases (mix visible and hidden)

Respond with ONLY valid JSON, no markdown, no explanation:

{
  "mode": "competitive",
  "title": "...",
  "statement": "...",
  "difficulty": "${difficulty}",
  "constraints": ["...", "..."],
  "examples": [
    { "input": "...", "output": "...", "explanation": "..." }
  ],
  "testCases": [
    { "input": "...", "expectedOutput": "...", "isHidden": false },
    { "input": "...", "expectedOutput": "...", "isHidden": false },
    { "input": "...", "expectedOutput": "...", "isHidden": true },
    { "input": "...", "expectedOutput": "...", "isHidden": true }
  ],
  "sourceKind": "generated",
  "referenceSolution": {
    "language": "${track}",
    "code": "...",
    "approach": "..."
   }
}`;
}

async function generateWithRetry(prompt: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await model.generateContent(prompt);
      return response.response.text();
    } catch (err: unknown) {
      const isLast = attempt === retries;
      const is503 = String(err).includes("503");

      if (is503 && !isLast) {
        const waitMs = attempt * 2000;
        await new Promise((res) => setTimeout(res, waitMs));
        continue;
      }

      throw err;
    }
  }
  throw new Error("Generation failed after retries");
}

export async function POST(request: Request) {
  const payload = await request.json();
  const result = problemSchema.safeParse(payload);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Invalid problem payload",
        issues: result.error.flatten(),
      },
      { status: 400 }
    );
  }

    const { matchId } = result.data;

    const match = await prisma.match.findUnique({
    where: { id: matchId },
    });

    if (!match) {
    return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
    );
    }
    
    const difficulty = match.difficulty as "easy"|"medium"|"hard"
    const track = match.duelLanguage ?? match.devCategory ?? "javascript"


    try{

    const prompt = buildPrompt(difficulty, track);
    const rawText = await generateWithRetry(prompt);

    const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

    let parsed: unknown;
    try {
    parsed = JSON.parse(cleaned);
    } catch {
    return NextResponse.json(
        { error: "AI returned invalid JSON", raw: cleaned.slice(0, 300) },
        { status: 500 }
    );
    }

    const validated = competitiveProblemSchema.safeParse(parsed);
    if (!validated.success) {
    return NextResponse.json(
        { error: "AI response failed validation", issues: validated.error.flatten() },
        { status: 500 }
    );
    }

    const problem = await prisma.problem.create({
    data: {
        mode: "competitive",
        title: validated.data.title,
        prompt: validated.data.statement,
        difficulty: validated.data.difficulty,
        sourceKind: validated.data.sourceKind,
        generatorVersion: "gemini-2.5-flash",
        rawJson: validated.data as object,
        matchId,
    },
    });

    return NextResponse.json({problem})

    }catch(err){
        console.error("[generate-problem]",err);
        return NextResponse.json(
            {error: "Problem generation failed", detail: String(err)},
            {status: 500}
        );
    }

}      