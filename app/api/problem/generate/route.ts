// import { z } from "zod";
// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { competitiveProblemSchema } from "@/lib/problem-schemas";




// import { GoogleGenerativeAI } from "@google/generative-ai";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
// const model = genAI.getGenerativeModel({ 
//     model: "gemini-2.5-flash" ,
    
//     generationConfig: {
//         // @ts-ignore
//         responseMimeType: "application/json",
//         // @ts-ignore
//         thinkingConfig: { thinkingBudget: 0 },
//     }
// });


// const problemSchema = z.object({
//   matchId: z.string().min(1),
// //   mode: z.enum(["competitive", "dev"]),
// //   difficulty: z.enum(["easy", "medium", "hard"]),
// //   track: z.string().min(1),
// });


// function buildPrompt(difficulty: string, track: string): string {
//   return `Generate a competitive programming problem as JSON.

// The problem must use FUNCTION MODE — the user writes a function, not stdin/stdout code.

// Return this exact JSON structure:

// {
//   "mode": "competitive",
//   "title": "short title",
//   "statement": "Describe the problem in 2-3 sentences. State what the function receives and what it should return.",
//   "difficulty": "${difficulty}",
//   "constraints": ["constraint 1", "constraint 2"],
//   "functionSignature": {
//     "name": "functionName",
//     "params": [
//       { "name": "paramName", "type": "number|number[]|string|string[]|boolean" }
//     ],
//     "returnType": "number|number[]|string|string[]|boolean"
//   },
//   "examples": [
//     {
//       "args": [actualValue1, actualValue2],
//       "output": actualOutputValue,
//       "explanation": "brief explanation"
//     }
//   ],
//   "testCases": [
//     { "args": [actualValue1, actualValue2], "expectedOutput": actualValue, "isHidden": false },
//     { "args": [actualValue1, actualValue2], "expectedOutput": actualValue, "isHidden": false },
//     { "args": [actualValue1, actualValue2], "expectedOutput": actualValue, "isHidden": true },
//     { "args": [actualValue1, actualValue2], "expectedOutput": actualValue, "isHidden": true }
//   ],
//   "referenceSolution": {
//     "language": "${track}",
//     "code": "function solution here",
//     "approach": "one sentence"
//   },
//   "sourceKind": "generated"
// }

// Rules:
// - difficulty must be "${difficulty}"
// - Keep ALL test case args small enough that you can manually verify the expected output
// - NEVER generate test cases with large numbers you cannot verify by hand
// - args and expectedOutput must be actual JSON values, NOT strings
// - Return ONLY the JSON object, nothing else. Do NOT return markdown, do NOT return explanations, do NOT return any text outside the JSON. ONLY return the JSON object.`;
// }

// async function generateWithRetry(prompt: string, retries = 3): Promise<string> {
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const response = await model.generateContent(prompt);
//       return response.response.text();
//     } catch (err: unknown) {
//       const isLast = attempt === retries;
//       const is503 = String(err).includes("503");

//       if (is503 && !isLast) {
//         const waitMs = attempt * 2000;
//         await new Promise((res) => setTimeout(res, waitMs));
//         continue;
//       }

//       throw err;
//     }
//   }
//   throw new Error("Generation failed after retries");
// }

// export async function POST(request: Request) {
//   const payload = await request.json();
//   const result = problemSchema.safeParse(payload);
//   if (!result.success) {
//     return NextResponse.json(
//       {
//         error: "Invalid problem payload",
//         issues: result.error.flatten(),
//       },
//       { status: 400 }
//     );
//   }

//     const { matchId } = result.data;

//     try{

//     const match = await prisma.match.findUnique({
//     where: { id: matchId },
//     });

//     if (!match) {
//     return NextResponse.json(
//         { error: "Match not found" },
//         { status: 404 }
//     );
//     }

//     const existing = await prisma.problem.findUnique({
//         where: { matchId },
//     });
//     if (existing) {
//         return NextResponse.json({ problem: existing });
//     }
    
//     const difficulty = match.difficulty as "easy"|"medium"|"hard"
//     const track = match.duelLanguage ?? match.devCategory ?? "javascript"


//     const prompt = buildPrompt(difficulty, track);
//     const rawText = await generateWithRetry(prompt);

//     const cleaned = rawText
//     .replace(/^```json\s*/i, "")
//     .replace(/^```\s*/i, "")
//     .replace(/```$/i, "")
//     .trim();

//     let parsed: unknown;
//     try {
//     parsed = JSON.parse(cleaned);
//     } catch {
//     return NextResponse.json(
//         { error: "AI returned invalid JSON", raw: cleaned.slice(0, 300) },
//         { status: 500 }
//     );
//     }

//     const validated = competitiveProblemSchema.safeParse(parsed);
//     if (!validated.success) {
//     return NextResponse.json(
//         { error: "AI response failed validation", issues: validated.error.flatten() },
//         { status: 500 }
//     );
//     }

//     const problem = await prisma.problem.create({
//     data: {
//         mode: "competitive",
//         title: validated.data.title,
//         prompt: validated.data.statement,
//         difficulty: validated.data.difficulty,
//         sourceKind: validated.data.sourceKind,
//         generatorVersion: "gemini-2.5-flash",
//         rawJson: validated.data as object,
//         matchId,
//     },
//     });

//     return NextResponse.json({problem})

//     }catch(err){
//         console.error("[generate-problem] FULL ERROR:", JSON.stringify(err, null, 2), String(err));
//         console.error("[generate-problem]",err);
//         return NextResponse.json(
//             {error: "Problem generation failed", detail: String(err)},
//             {status: 500}
//         );
//     }

// }      



import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { problemSeeds } from "@/lib/problem-seeds";

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
    // 1. Fetch the match
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // 2. Return existing problem if already generated
    const existing = await prisma.problem.findUnique({ where: { matchId } });
    if (existing) {
      return NextResponse.json({ problem: existing });
    }

    // 3. Pick a random seed matching difficulty
    const difficulty = match.difficulty as "easy" | "medium" | "hard";
    const matching = problemSeeds.filter((p) => p.difficulty === difficulty);
    const pool = matching.length > 0 ? matching : problemSeeds;
    const seed = pool[Math.floor(Math.random() * pool.length)];

    // 4. Persist to DB
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
