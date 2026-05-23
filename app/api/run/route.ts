import { z } from "zod";
import { NextResponse } from "next/server";

const runSchema = z.object({
  language: z.string(),
  code: z.string(),
  stdin: z.string().optional(),
});

// OneCompiler language IDs and file names
const langMap: Record<string, { lang: string; fileName: string }> = {
  javascript: { lang: "nodejs",  fileName: "index.js"  },
  python:     { lang: "python",  fileName: "main.py"   },
  cpp:        { lang: "cpp",     fileName: "main.cpp"  },
  go:         { lang: "go",      fileName: "main.go"   },
  rust:       { lang: "rust",    fileName: "main.rs"   },
};

async function callOneCompiler(
  language: string,
  code: string,
  stdin: string,
  retries = 3
): Promise<{ stdout: string; stderr: string }> {
  const mapping = langMap[language] ?? { lang: language, fileName: "main.txt" };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch("https://onecompiler.com/api/v1/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: mapping.lang,
          stdin,
          files: [{ name: mapping.fileName, content: code }],
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OneCompiler HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      return {
        stdout: data.stdout ?? "",
        stderr: data.stderr ?? "",
      };
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  return { stdout: "", stderr: "" };
}

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

  try {
    const { stdout, stderr } = await callOneCompiler(language, code, stdin ?? "");
    return NextResponse.json({ stdout, stderr, exitCode: stderr ? 1 : 0 });
  } catch (err) {
    console.error("[run] execution error:", err);
    return NextResponse.json(
      { error: "Code execution failed", detail: String(err) },
      { status: 500 }
    );
  }
}
