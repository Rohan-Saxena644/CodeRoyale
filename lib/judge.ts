// lib/judge.ts
// Shared Judge0 execution logic — imported directly by both /api/run and
// /api/submit so that submit never needs to HTTP-fetch /api/run (which
// breaks on Vercel because serverless functions cannot loopback-call each
// other via their own public URL).

// ── Type maps ─────────────────────────────────────────────────────────────────

export const languageIds: Record<string, number> = {
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

const rustTypeMap: Record<string, string> = {
  "number": "i64",
  "number[]": "Vec<i64>",
  "string": "String",
  "string[]": "Vec<String>",
  "boolean": "bool",
};

// ── Escape helpers ────────────────────────────────────────────────────────────

function escapeCString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

// ── C++ literal builder ───────────────────────────────────────────────────────

function toCppLiteral(value: unknown, type: string): string {
  if (type === "number[]" && Array.isArray(value)) {
    return `{${(value as number[]).join(",")}}`;
  }
  if (type === "string[]" && Array.isArray(value)) {
    return `{${(value as string[]).map((s) => `"${escapeCString(s)}"`).join(",")}}`;
  }
  if (type === "string") return `"${escapeCString(String(value))}"`;
  if (type === "boolean") return value ? "true" : "false";
  return String(value);
}

// ── Java literal builder ──────────────────────────────────────────────────────

function toJavaStringLiteral(s: string): string {
  return `"${escapeCString(s)}"`;
}

// ── Go boilerplate stripper ───────────────────────────────────────────────────

function stripGoBoilerplate(code: string): string {
  return code
    .replace(/^package\s+main\s*\r?\n?/m, "")
    .replace(/^import\s*\([\s\S]*?\)\s*\r?\n?/m, "")
    .replace(/^import\s+"[^"]*"\s*\r?\n?/gm, "")
    .trim();
}

// ── Driver builder ────────────────────────────────────────────────────────────

export function buildDriver(
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
  if (language === "python") {
    return {
      code: [
        "import json, sys",
        "",
        userCode,
        "",
        "__args = json.loads(sys.stdin.read())",
        `print(json.dumps(${functionName}(*__args), separators=(',', ':')))`,
      ].join("\n"),
      stdin: argsJson,
    };
  }

  // ── Go ───────────────────────────────────────────────────────────────────
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

  // ── C++ ──────────────────────────────────────────────────────────────────
  if (language === "cpp") {
    const argDecls = (params ?? [])
      .map((p, i) => {
        const cppType = cppTypeMap[p.type] ?? "int";
        const lit = toCppLiteral(args[i], p.type);
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
      "static inline void _pesc(const string& v) {",
      "    cout << '\"';",
      "    for (char c : v) {",
      "        if (c == '\\\\' || c == '\"') cout << '\\\\' << c;",
      "        else if (c == '\\n') cout << \"\\\\n\";",
      "        else if (c == '\\r') cout << \"\\\\r\";",
      "        else if (c == '\\t') cout << \"\\\\t\";",
      "        else cout << c;",
      "    }",
      "    cout << '\"';",
      "}",
      "static inline void _p(const string& v)      { _pesc(v); }",
      "static inline void _p(const vector<int>& v) {",
      "    cout << \"[\";",
      "    for(int i=0;i<(int)v.size();i++){if(i)cout<<\",\";cout<<v[i];}",
      "    cout << \"]\";",
      "}",
      "static inline void _p(const vector<string>& v) {",
      "    cout << \"[\";",
      "    for(int i=0;i<(int)v.size();i++){if(i)cout<<\",\";_pesc(v[i]);}",
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

  // ── Java ──────────────────────────────────────────────────────────────────
  if (language === "java") {
    const argDecls = (params ?? [])
      .map((p, i) => {
        if (p.type === "number[]")
          return `        int[] _p${i} = new int[]{${(args[i] as number[]).join(",")}};`;
        if (p.type === "string[]")
          return `        String[] _p${i} = new String[]{${(args[i] as string[]).map((s: string) => toJavaStringLiteral(s)).join(",")}};`;
        if (p.type === "string")
          return `        String _p${i} = ${toJavaStringLiteral(String(args[i]))};`;
        if (p.type === "boolean")
          return `        boolean _p${i} = ${args[i]};`;
        return `        int _p${i} = ${args[i]};`;
      })
      .join("\n");

    const callArgs = (params ?? []).map((_, i) => `_p${i}`).join(", ");

    const hasClassWrapper = /public\s+class\s+Main/.test(userCode);
    const inner = hasClassWrapper
      ? userCode
          .replace(/^[\s\S]*?public\s+class\s+Main\s*\{/, "")
          .replace(/\}\s*$/, "")
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
      "    static final String _Q = String.valueOf((char) 34);",
      "",
      "    static String _jsonEscape(String s) {",
      "        StringBuilder sb = new StringBuilder();",
      "        for (int i = 0; i < s.length(); i++) {",
      "            char c = s.charAt(i);",
      "            if (c == 92) { sb.append((char) 92).append((char) 92); }",
      "            else if (c == 34) { sb.append((char) 92).append((char) 34); }",
      "            else if (c == 10) { sb.append((char) 92).append('n'); }",
      "            else if (c == 13) { sb.append((char) 92).append('r'); }",
      "            else if (c == 9)  { sb.append((char) 92).append('t'); }",
      "            else if (c < 32) {",
      "                String hex = Integer.toHexString(c);",
      "                while (hex.length() < 4) hex = '0' + hex;",
      "                sb.append((char) 92).append('u').append(hex);",
      "            }",
      "            else sb.append(c);",
      "        }",
      "        return sb.toString();",
      "    }",
      "",
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
      "            for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(\",\"); sb.append(_Q).append(_jsonEscape(a[i])).append(_Q); }",
      "            return sb.append(\"]\").toString();",
      "        }",
      "        if (o instanceof Boolean) return o.toString();",
      "        if (o instanceof String)  return _Q + _jsonEscape((String) o) + _Q;",
      "        return String.valueOf(o);",
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

  // ── Rust ─────────────────────────────────────────────────────────────────
  if (language === "rust") {
    const paramTypes = (params ?? []).map((p) => rustTypeMap[p.type] ?? "i64");
    const callArgs = (params ?? []).map((_, i) => `_p${i}`).join(", ");

    const letBindings = (params ?? [])
      .map((p, i) => {
        const rt = rustTypeMap[p.type] ?? "i64";
        return `    let _p${i}: ${rt} = serde_json::from_value(_raw[${i}].clone()).unwrap();`;
      })
      .join("\n");

    const stripped = userCode
      .replace(/fn\s+main\s*\(\s*\)\s*\{[\s\S]*?\n\}/m, "")
      .trim();

    const code = [
      "use std::io::{self, Read};",
      "",
      stripped,
      "",
      "fn main() {",
      "    let mut input = String::new();",
      "    io::stdin().read_to_string(&mut input).unwrap();",
      "    let _raw: Vec<serde_json::Value> = serde_json::from_str(&input).unwrap();",
      letBindings,
      `    let _result = ${functionName}(${callArgs});`,
      '    println!("{}", serde_json::to_string(&_result).unwrap());',
      "}",
    ].join("\n");

    return { code, stdin: argsJson };
  }

  // fallback
  return { code: userCode, stdin: "" };
}

// ── Judge0 execution ──────────────────────────────────────────────────────────

export type Judge0Result = {
  token?: string;
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  status?: { id: number; description: string };
};

const JUDGE0_BASE_URL = "https://ce.judge0.com";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPending(data: Judge0Result | null | undefined): boolean {
  return !!data?.status && (data.status.id === 1 || data.status.id === 2);
}

export async function runOnJudge0(
  sourceCode: string,
  languageId: number,
  stdin: string
): Promise<{ data?: Judge0Result; error?: string }> {
  const maxAttempts = 4;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const isLastAttempt = attempt === maxAttempts - 1;
    if (attempt > 0) await sleep(1000 * attempt);

    let res: Response;
    try {
      res = await fetch(`${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: sourceCode, language_id: languageId, stdin }),
      });
    } catch (err) {
      if (isLastAttempt) return { error: `Network error contacting Judge0: ${String(err)}` };
      continue;
    }

    if (res.status === 429) {
      if (isLastAttempt) return { error: "Judge0 rate limit (429) — please try again in a moment" };
      continue;
    }

    if (!res.ok) {
      if (isLastAttempt) return { error: `Judge0 returned HTTP ${res.status}` };
      continue;
    }

    let data: Judge0Result;
    try {
      data = await res.json();
    } catch (err) {
      if (isLastAttempt) return { error: `Judge0 returned an unreadable response: ${String(err)}` };
      continue;
    }

    // Poll by token while the submission is still queued/processing.
    let pollAttempts = 0;
    while (isPending(data) && data.token && pollAttempts < 5) {
      await sleep(500 + pollAttempts * 500);
      try {
        const pollRes = await fetch(
          `${JUDGE0_BASE_URL}/submissions/${data.token}?base64_encoded=false`
        );
        if (pollRes.ok) data = await pollRes.json();
      } catch {
        // ignore transient poll errors
      }
      pollAttempts++;
    }

    if (isPending(data)) {
      if (isLastAttempt) {
        return { error: `Judge0 timed out while ${data.status?.description ?? "processing"}` };
      }
      continue;
    }

    return { data };
  }

  return { error: "Judge0 did not respond after several attempts" };
}