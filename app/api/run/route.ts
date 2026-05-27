import { z } from "zod";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const runSchema = z.object({
  language: z.string(),
  code: z.string(),
  functionName: z.string(),
  args: z.array(z.unknown()),
  params: z.array(z.object({
    name: z.string(),
    type: z.string(),
  })).optional(),
});

const languageIds: Record<string, number> = {
  javascript: 93,
  python: 71,
  cpp: 54,
  java: 62,
  go: 60,
  rust: 73,
};

const goTypeMap: Record<string, string> = {
  "number": "int",
  "number[]": "[]int",
  "string": "string",
  "string[]": "[]string",
  "boolean": "bool",
};

const cppTypeMap: Record<string, string> = {
  "number": "int",
  "number[]": "vector<int>",
  "string": "string",
  "string[]": "vector<string>",
  "boolean": "bool",
};

function toCppLiteral(value: unknown, type: string): string {
  if (type === "number[]" && Array.isArray(value)) {
    return `{${(value as number[]).join(", ")}}`;
  }
  if (type === "string[]" && Array.isArray(value)) {
    return `{${(value as string[]).map(s => `"${s}"`).join(", ")}}`;
  }
  if (type === "string") return `"${value}"`;
  if (type === "boolean") return value ? "true" : "false";
  return String(value);
}

function stripGoBoilerplate(code: string): string {
  return code
    .replace(/^package\s+main\s*\r?\n?/m, "")
    .replace(/^import\s*\([\s\S]*?\)\s*\r?\n?/m, "")
    .replace(/^import\s+"[^"]*"\s*\r?\n?/gm, "")
    .trim();
}

function buildDriver(
  language: string,
  userCode: string,
  functionName: string,
  args: unknown[],
  params?: { name: string; type: string }[]
): { code: string; stdin: string } {
  const argsJson = JSON.stringify(args);

  if (language === "javascript") {
    return {
      code: `${userCode}\nconst __args = ${argsJson};\nconsole.log(JSON.stringify(${functionName}(...__args)));`,
      stdin: "",
    };
  }

  if (language === "python") {
    const safeArgs = argsJson.replace(/\\/g, "\\\\").replace(/"""/g, '\\"\\"\\"');
    return {
      code: `import json\n\n${userCode}\n\n__args = json.loads("""${safeArgs}""")\nprint(json.dumps(${functionName}(*__args)))`,
      stdin: "",
    };
  }

  if (language === "go") {
    const stripped = stripGoBoilerplate(userCode);
    const unmarshalLines = (params ?? [])
      .map((p, i) => {
        const goType = goTypeMap[p.type] ?? "interface{}";
        return `\tvar _p${i} ${goType}\n\tjson.Unmarshal(_rawArgs[${i}], &_p${i})`;
      })
      .join("\n");
    const callArgs = (params ?? []).map((_, i) => `_p${i}`).join(", ");

    const code = [
      "package main",
      "",
      'import (',
      '\t"encoding/json"',
      '\t"fmt"',
      '\t"io"',
      '\t"os"',
      ")",
      "",
      stripped,
      "",
      "func main() {",
      "\t_input, _ := io.ReadAll(os.Stdin)",
      "\tvar _rawArgs []json.RawMessage",
      "\tjson.Unmarshal(_input, &_rawArgs)",
      unmarshalLines,
      `\t_result := ${functionName}(${callArgs})`,
      "\t_out, _ := json.Marshal(_result)",
      "\tfmt.Println(string(_out))",
      "}",
    ].join("\n");

    return { code, stdin: argsJson };
  }

  if (language === "cpp") {
    const argDecls = (params ?? [])
      .map((p, i) => {
        const cppType = cppTypeMap[p.type] ?? "auto";
        const literal = toCppLiteral(args[i], p.type);
        return `    ${cppType} _p${i} = ${cppType === "int" || cppType === "bool" ? literal : `${cppType}${literal}`};`;
      })
      .join("\n");
    const callArgs = (params ?? []).map((_, i) => `_p${i}`).join(", ");

    // Determine print strategy based on return type
    const retType = params && params.length > 0 ? "auto" : "auto";
    const printLine = `auto _r = ${functionName}(${callArgs});\n    cout << _r << endl;`;

    const code = [
      "#include <bits/stdc++.h>",
      "using namespace std;",
      "",
      userCode,
      "",
      "int main() {",
      argDecls,
      `    ${printLine}`,
      "    return 0;",
      "}",
    ].join("\n");

    return { code, stdin: "" };
  }

  if (language === "java") {
    const argDecls = (params ?? []).map((p, i) => {
      if (p.type === "number[]") return `        int[] _p${i} = new int[]{${(args[i] as number[]).join(",")}};`;
      if (p.type === "number") return `        int _p${i} = ${args[i]};`;
      if (p.type === "string") return `        String _p${i} = "${args[i]}";`;
      if (p.type === "string[]") return `        String[] _p${i} = new String[]{${(args[i] as string[]).map((s: string) => `"${s}"`).join(",")}};`;
      if (p.type === "boolean") return `        boolean _p${i} = ${args[i]};`;
      return `        Object _p${i} = null;`;
    }).join("\n");

    const callArgs = (params ?? []).map((_, i) => `_p${i}`).join(", ");

    // Strip user's outer class — we provide our own
    const inner = userCode
      .replace(/^[\s\S]*?public\s+class\s+Main\s*\{/, "")
      .replace(/\}\s*$/, "")
      .trim();

   return {
    code: `import java.util.*;
    public class Main {
    ${inner}

        public static void main(String[] args) {
    ${argDecls}
            Object _r = ${functionName}(${callArgs});
            System.out.println(toJson(_r));
        }

        static String toJson(Object o) {
            if (o instanceof int[]) {
                int[] a = (int[]) o;
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append(a[i]); }
                return sb.append("]").toString();
            }
            if (o instanceof String[]) {
                String[] a = (String[]) o;
                StringBuilder sb = new StringBuilder("[");
                for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(","); sb.append("\\"").append(a[i]).append("\\""); }
                return sb.append("]").toString();
            }
            return String.valueOf(o);
        }
    }`,
    stdin: "",
  };
  }

  // fallback
  return { code: userCode, stdin: "" };
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

  const { language, code, functionName, args, params } = result.data;
  const languageId = languageIds[language];

  if (!languageId) {
    return NextResponse.json(
      { error: `Unsupported language: ${language}` },
      { status: 400 }
    );
  }

  const { code: fullCode, stdin } = buildDriver(language, code, functionName, args, params);

  try {
    const res = await fetch("https://ce.judge0.com/submissions?wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: fullCode,
        language_id: languageId,
        stdin,
      }),
    });

    const data = await res.json();
    console.log("[run] judge0:", JSON.stringify(data).slice(0, 300));

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
