import {z} from "zod"
import { NextResponse } from "next/server"

const runSchema = z.object({
    
  language: z.string(),
  code: z.string(),
  stdin: z.string().optional()  // optional, default empty string

})

const wandboxUrl = "https://wandbox.org/api/compile.json";

const compilerMap: Record<string, string> = {
  javascript: "nodejs-18.20.4",
  python: "cpython-3.12.7",
  cpp: "gcc-13.2.0",
  go: "go-1.23.2",
  rust: "rust-1.82.0",
};

async function callWandbox(compiler: string, code: string, stdin: string, retries = 2): Promise<{stdout: string, stderr: string}> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(wandboxUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compiler, code, stdin }),
    });
    const data = await response.json();
    const stdout = data.program_output ?? "";
    
    // If we got output or it's the last attempt, return
    if (stdout || attempt === retries) {
      return {
        stdout,
        stderr: data.compiler_error ?? data.program_error ?? ""
      };
    }
    
    // Wait 1 second before retry
    await new Promise(res => setTimeout(res, 1000));
  }
  return { stdout: "", stderr: "" };
}

export async function POST(request: Request){
    const payload = await request.json()
    const result = runSchema.safeParse(payload)

    if (!result.success) {
        return NextResponse.json(
        {
            error: "Invalid result check payload",
            issues: result.error.flatten(),
        },
        { status: 400 }
        );
    }

    const {language,code,stdin} = result.data

    

    try {
        const compiler = compilerMap[language] ?? "nodejs-18.12.1";

        const { stdout, stderr } = await callWandbox(compiler, code, stdin ?? "");

        return NextResponse.json({
        stdout,
        stderr,
        exitCode: stderr ? 1 : 0,
        });
    } catch (err) {
        console.error("[run] piston error:", err);
        return NextResponse.json(
            { error: "Code execution failed", detail: String(err) },
            { status: 500 }
        );
    }

}