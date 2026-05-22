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

        const response = await fetch(wandboxUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            compiler,
            code,
            stdin: stdin ?? "",
        }),
        });

        const data = await response.json();
        console.log("[run] wandbox raw response:", JSON.stringify(data, null, 2));

        return NextResponse.json({
        stdout: data.program_output ?? "",
        stderr: data.compiler_error ?? data.program_error ?? "",
        exitCode: data.status ?? 0,
        });
        } catch (err) {
            console.error("[run] piston error:", err);
            return NextResponse.json(
                { error: "Code execution failed", detail: String(err) },
                { status: 500 }
            );
        }

}