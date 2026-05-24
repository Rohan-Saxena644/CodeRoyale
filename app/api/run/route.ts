import { z } from "zod";
import { NextResponse } from "next/server";

const runSchema = z.object({
  language: z.string(),
  code: z.string(),
  functionName: z.string(),
  args: z.array(z.unknown()),
});

const languageIds: Record<string, number> = {
  javascript: 93,
  python: 71,
  cpp: 54,
  java: 62,
  go: 60,
  rust: 73,
};

function buildDriver(
  language: string,
  userCode: string,
  functionName: string,
  args: unknown[]
): string {
  const argsJson = JSON.stringify(args);

  if (language === "javascript") {
    return `
${userCode}

const args = ${argsJson};
const result = ${functionName}(...args);
console.log(JSON.stringify(result));
`;
  }

  if (language === "python") {
    return `
import json

${userCode}

args = json.loads('${argsJson.replace(/'/g, "\\'")}')
result = ${functionName}(*args)
print(json.dumps(result))
`;
  }

  if (language === "cpp") {
    return `
#include <bits/stdc++.h>
#include <nlohmann/json.hpp>
using namespace std;
using json = nlohmann::json;

${userCode}

int main() {
  json args = json::parse(R"(${argsJson})");
  // C++ driver is complex — use javascript or python for now
  return 0;
}
`;
  }

  // fallback — just run the code as-is
  return userCode;
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

  const { language, code, functionName, args } = result.data;
  const languageId = languageIds[language];

  if (!languageId) {
    return NextResponse.json(
      { error: `Unsupported language: ${language}` },
      { status: 400 }
    );
  }

  const fullCode = buildDriver(language, code, functionName, args);

  try {
    const res = await fetch("https://ce.judge0.com/submissions?wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: fullCode,
        language_id: languageId,
        stdin: "",
      }),
    });

    const data = await res.json();
    console.log("[run] judge0:", JSON.stringify(data));

    return NextResponse.json({
      stdout: data.stdout ?? "",
      stderr: data.stderr ?? data.compile_output ?? "",
      exitCode: data.status?.id === 3 ? 0 : 1,
    });
  } catch (err) {
    console.error("[run] error:", err);
    return NextResponse.json(
      { error: "Code execution failed", detail: String(err) },
      { status: 500 }
    );
  }
}
