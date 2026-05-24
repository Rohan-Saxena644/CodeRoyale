import { z } from "zod";
import { NextResponse } from "next/server";

const runSchema = z.object({
  language: z.string(),
  code: z.string(),
  stdin: z.string().optional(),
});

const languageIds: Record<string, number> = {
  javascript: 93,
  python: 71,
  cpp: 54,
  java: 62,
  go: 60,
  rust: 73,
};

export async function POST(request: Request) {
  const payload = await request.json();
  const result = runSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid run payload", issues: result.error.flatten() },
      { status: 400 }
    );
  }

  const { language, code, stdin } = result.data;
  const languageId = languageIds[language];

  if (!languageId) {
    return NextResponse.json(
      { error: `Unsupported language: ${language}` },
      { status: 400 }
    );
  }

  try {
    const res = await fetch("https://ce.judge0.com/submissions?wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: stdin ?? "",
      }),
    });

    const data = await res.json();
    console.log("[run] judge0 response:", JSON.stringify(data));

    return NextResponse.json({
      stdout: data.stdout ?? "",
      stderr: data.stderr ?? data.compile_output ?? "",
      exitCode: data.status?.id === 3 ? 0 : 1,
    });
  } catch (err) {
    console.error("[run] judge0 error:", err);
    return NextResponse.json(
      { error: "Code execution failed", detail: String(err) },
      { status: 500 }
    );
  }
}
