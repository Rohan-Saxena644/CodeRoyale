import { z } from "zod";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

// ── C++ literal builder ──────────────────────────────────────────────────────
function toCppLiteral(value: unknown, type: string): string {
  if (type === "number[]" && Array.isArray(value)) {
    return `{${(value as number[]).join(",")}}`;
  }
  if (type === "string[]" && Array.isArray(value)) {
    return `{${(value as string[]).map((s) => `"${s}"`).join(",")}}`;
  }
  if (type === "string") return `"${value}"`;
  if (type === "boolean") return value ? "true" : "false";
  return String(value);
}

// ── Go boilerplate stripper ──────────────────────────────────────────────────
function stripGoBoilerplate(code: string): string {
  return code
    .replace(/^package\s+main\s*\r?\n?/m, "")
    .replace(/^import\s*\([\s\S]*?\)\s*\r?\n?/m, "")
    .replace(/^import\s+"[^"]*"\s*\r?\n?/gm, "")
    .trim();
}

// ── Driver builders ──────────────────────────────────────────────────────────
function buildDriver(
  language: string,
  userCode: string,
  functionName: string,
  args: unknown[],
  params?: { name: string; type: string }[]
): { code: string; stdin: string } {
  const argsJson = JSON.stringify(args);

  // ── JavaScript ──────────────────────────────────────────────────────────
  if (language === "javascript") {
    return {
      code: [
        userCode,
        `const __args = ${argsJson};`,
        `console.log(JSON.stringify(${functionName}(...__args)));`,
      ].join("\n"),
      stdin: "",
    };
  }

  // ── Python ──────────────────────────────────────────────────────────────
  // FIX: use separators=(',',':') so output matches JSON.stringify (no spaces)
  if (language === "python") {
    const safeArgs = argsJson
      .replace(/\\/g, "\\\\")
      .replace(/"""/g, '\\"\\"\\"');
    return {
      code: [
        "import json",
        "",
        userCode,
        "",
        `__args = json.loads("""${safeArgs}""")`,
        `print(json.dumps(${functionName}(*__args), separators=(',', ':')))`,
      ].join("\n"),
      stdin: "",
    };
  }

  // ── Go ──────────────────────────────────────────────────────────────────
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
      "import (",
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

  // ── C++ ─────────────────────────────────────────────────────────────────
  // FIX 1: arg declarations use plain literals, not `TypeLiteral` syntax
  // FIX 2: overloaded _p() helpers handle every return type correctly
  if (language === "cpp") {
    const argDecls = (params ?? [])
      .map((p, i) => {
        const cppType = cppTypeMap[p.type] ?? "int";
        const lit = toCppLiteral(args[i], p.type);
        // For vectors, brace-init works: vector<int> _p0 = {1,2,3};
        // For string: string _p0 = "hello";
        // For int/bool: int _p0 = 5;
        return `    ${cppType} _p${i} = ${lit};`;
      })
      .join("\n");

    const callArgs = (params ?? []).map((_, i) => `_p${i}`).join(", ");

    const code = [
      "#include <bits/stdc++.h>",
      "using namespace std;",
      "",
      "// ── JSON-compatible print helpers ──────────────────────────────────",
      "static inline void _p(int v)               { cout << v; }",
      "static inline void _p(long long v)          { cout << v; }",
      "static inline void _p(double v)             { cout << v; }",
      "static inline void _p(bool v)               { cout << (v?\"true\":\"false\"); }",
      "static inline void _p(const string& v)      { cout << '\"' << v << '\"'; }",
      "static inline void _p(const vector<int>& v) {",
      "    cout << \"[\";",
      "    for(int i=0;i<(int)v.size();i++){if(i)cout<<\",\";cout<<v[i];}",
      "    cout << \"]\";",
      "}",
      "static inline void _p(const vector<string>& v) {",
      "    cout << \"[\";",
      "    for(int i=0;i<(int)v.size();i++){if(i)cout<<\",\";cout<<'\"'<<v[i]<<'\"';}",
      "    cout << \"]\";",
      "}",
      "static inline void _p(const vector<bool>& v) {",
      "    cout << \"[\";",
      "    for(int i=0;i<(int)v.size();i++){if(i)cout<<\",\";cout<<(v[i]?\"true\":\"false\");}",
      "    cout << \"]\";",
      "}",
      "",
      "// ── User code ────────────────────────────────────────────────────────",
      userCode,
      "",
      "int main(){",
      argDecls,
      `    auto _r = ${functionName}(${callArgs});`,
      "    _p(_r);",
      '    cout << "\\n";',
      "    return 0;",
      "}",
    ].join("\n");

    return { code, stdin: "" };
  }

  // ── Java ─────────────────────────────────────────────────────────────────
  // FIX 1: don't strip closing } from method body when there's no class wrapper
  // FIX 2: toJson handles String return type (adds quotes)
  // FIX 3: consistent 4-space indentation throughout
  if (language === "java") {
    const argDecls = (params ?? [])
      .map((p, i) => {
        if (p.type === "number[]")
          return `        int[] _p${i} = new int[]{${(args[i] as number[]).join(",")}};`;
        if (p.type === "string[]")
          return `        String[] _p${i} = new String[]{${(args[i] as string[]).map((s: string) => `"${s}"`).join(",")}};`;
        if (p.type === "string")
          return `        String _p${i} = "${args[i]}";`;
        if (p.type === "boolean")
          return `        boolean _p${i} = ${args[i]};`;
        return `        int _p${i} = ${args[i]};`; // number default
      })
      .join("\n");

    const callArgs = (params ?? []).map((_, i) => `_p${i}`).join(", ");

    // If user wrapped their code in `public class Main { ... }`, strip the wrapper.
    // If they wrote just the method (as our stub shows), embed it directly.
    const hasClassWrapper = /public\s+class\s+Main/.test(userCode);
    const inner = hasClassWrapper
      ? userCode
          .replace(/^[\s\S]*?public\s+class\s+Main\s*\{/, "")
          .replace(/\}\s*$/, "")   // remove outer class closing brace
          .trim()
      : userCode.trim();

    const code = [
      "import java.util.*;",
      "import java.util.stream.*;",
      "",
      "public class Main {",
      "",
      "    // ── User code ──────────────────────────────────────────────────",
      "    " + inner.split("\n").join("\n    "),
      "",
      "    // ── JSON-compatible serializer ──────────────────────────────────",
      "    static String _toJson(Object o) {",
      "        if (o instanceof int[]) {",
      "            int[] a = (int[]) o;",
      "            StringBuilder sb = new StringBuilder(\"[\");",
      "            for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(\",\"); sb.append(a[i]); }",
      "            return sb.append(\"]\").toString();",
      "        }",
      "        if (o instanceof String[]) {",
      "            String[] a = (String[]) o;",
      "            StringBuilder sb = new StringBuilder(\"[\");",
      "            for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(\",\"); sb.append(\"\\\"\").append(a[i]).append(\"\\\"\"); }",
      "            return sb.append(\"]\").toString();",
      "        }",
      "        if (o instanceof Boolean) return o.toString();",          // true / false
      "        if (o instanceof String)  return \"\\\"\" + o + \"\\\"\";", // quoted string
      "        return String.valueOf(o);",                                // int, long, etc.
      "    }",
      "",
      "    public static void main(String[] args) {",
      argDecls,
      `        Object _r = ${functionName}(${callArgs});`,
      "        System.out.println(_toJson(_r));",
      "    }",
      "}",
    ].join("\n");

    return { code, stdin: "" };
  }

  // fallback — unsupported language, return code as-is
  return { code: userCode, stdin: "" };
}

// ── POST handler ─────────────────────────────────────────────────────────────
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
    console.log("[run] judge0 status:", data.status?.description, "| stderr:", data.stderr?.slice(0, 200));

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