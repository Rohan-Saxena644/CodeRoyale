import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { buildDriver, executionError, outputsMatch, runOnJudge0 } from "../lib/judge";
import { cases, solution } from "./judge-fixtures";

test("JavaScript drivers execute every supported value type", () => {
  for (const { type, value } of cases) {
    const driver = buildDriver("javascript", solution("javascript", type), "echo", [value], [{ name: "value", type }], type);
    const result = spawnSync(process.execPath, ["-e", driver.code], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(outputsMatch(result.stdout, value));
  }
});

test("output comparison accepts JSON whitespace and rejects incorrect values", () => {
  assert.ok(outputsMatch("[1, 2, 3]\n", [1, 2, 3]));
  assert.ok(outputsMatch('"hello"\n', "hello"));
  assert.equal(outputsMatch("false", true), false);
  assert.equal(outputsMatch("0", "0"), false);
  assert.equal(outputsMatch("debug\n42", 42), false);
});

test("runtime errors remain failures even with correct stdout", () => {
  assert.equal(executionError({ status: { id: 11, description: "Runtime Error" }, stdout: "42" }), "Runtime Error");
  assert.equal(executionError({ status: { id: 6, description: "Compilation Error" }, compile_output: "bad source" }), "bad source");
  assert.equal(executionError({ status: { id: 3, description: "Accepted" }, stderr: "debug log" }), undefined);
  assert.ok(executionError({ stdout: "42" }));
});

test("Judge0 polls token-only responses and sends authentication on every request", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.JUDGE0_AUTH_TOKEN;
  const calls: string[] = [];
  process.env.JUDGE0_AUTH_TOKEN = "test-token";
  globalThis.fetch = async (input, init) => {
    calls.push(String(input));
    assert.equal(new Headers(init?.headers).get("X-Auth-Token"), "test-token");
    if (calls.length === 1) {
      const body = JSON.parse(String(init?.body));
      assert.equal(Buffer.from(body.source_code, "base64").toString(), "test");
    }
    return Response.json(calls.length === 1 ? { token: "test-token-id" } : { status: { id: 3, description: "Accepted" }, stdout: Buffer.from("42").toString("base64") });
  };
  try {
    const result = await runOnJudge0("test", 93, "");
    assert.equal(result.data?.stdout, "42");
    assert.ok(calls[0].includes("wait=false"));
    assert.ok(calls[1].includes("/submissions/test-token-id?"));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.JUDGE0_AUTH_TOKEN;
    else process.env.JUDGE0_AUTH_TOKEN = originalToken;
  }
});

test("Judge0 rejects missing status and reports service errors", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({});
    assert.match((await runOnJudge0("test", 93, "")).error ?? "", /timed out/);
    globalThis.fetch = async () => Response.json({ status: { id: 13, description: "Internal Error" } });
    assert.match((await runOnJudge0("test", 93, "")).error ?? "", /internal execution error/);
    globalThis.fetch = async () => new Response("Unauthorized", { status: 401 });
    assert.match((await runOnJudge0("test", 93, "")).error ?? "", /HTTP 401/);
  } finally { globalThis.fetch = originalFetch; }
});
