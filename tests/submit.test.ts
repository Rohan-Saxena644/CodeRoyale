import assert from "node:assert/strict";
import { test } from "node:test";
const prisma = {
  match: { async findUnique() { throw new Error("Unmocked match read"); } },
  problem: { async findUnique() { throw new Error("Unmocked problem read"); } },
  submission: { async create() { throw new Error("Unmocked submission write"); } },
};
// Install a fake client before importing the route. No real database is used.
Object.assign(globalThis, { prisma });
async function POST(request: Request) {
  return (await import("../app/api/submit/route")).POST(request);
}

function request(id: string) {
  return new Request("http://localhost/api/submit", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matchId: id, role: "host", language: "rust", code: "fn answer() -> Vec<i64> { vec![1, 2] }" }),
  });
}

test("submit preserves Rust return types and does not expose hidden tests", async (t) => {
  t.after(() => t.mock.restoreAll());
  // Use no winner on the first read and an existing winner on the final read,
  // avoiding a socket notification while testing an accepted submission.
  let reads = 0;
  t.mock.method(prisma.match, "findUnique", async () => ({ status: "active", winnerRole: ++reads === 1 ? null : "guest" }));
  t.mock.method(prisma.problem, "findUnique", async () => ({ rawJson: {
    functionSignature: { name: "answer", params: [], returnType: "number[]" },
    testCases: [
      { args: [], expectedOutput: [1, 2], isHidden: false },
      { args: ["hidden-input"], expectedOutput: [1, 2], isHidden: true },
    ],
  } }));
  t.mock.method(prisma.submission, "create", async (args: { data: Record<string, unknown> }) => ({ id: "submission-test", ...args.data }));
  t.mock.method(globalThis, "fetch", async (_input: unknown, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    assert.ok(Buffer.from(body.source_code, "base64").toString().includes('_parts.join(",")'));
    return Response.json({ status: { id: 3, description: "Accepted" }, stdout: Buffer.from("[1, 2]\n").toString("base64") });
  });
  const res = await POST(request("accept-test"));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.verdict, "AC");
  assert.equal(body.passedTests, 2);
  assert.equal(body.results.length, 1);
  assert.equal(JSON.stringify(body).includes("hidden-input"), false);
  assert.equal(body.submission.outputJson, undefined);
});

test("submit refuses correct output from a failed execution", async (t) => {
  t.after(() => t.mock.restoreAll());
  t.mock.method(prisma.match, "findUnique", async () => ({ status: "active", winnerRole: null }));
  t.mock.method(prisma.problem, "findUnique", async () => ({ rawJson: {
    functionSignature: { name: "answer", params: [], returnType: "number[]" },
    testCases: [{ args: [], expectedOutput: [1, 2], isHidden: false }],
  } }));
  t.mock.method(prisma.submission, "create", async (args: { data: Record<string, unknown> }) => ({ id: "failed-test", ...args.data }));
  t.mock.method(globalThis, "fetch", async () => Response.json({ status: { id: 11, description: "Runtime Error" }, stdout: Buffer.from("[1,2]").toString("base64") }));
  const body = await (await POST(request("runtime-test"))).json();
  assert.equal(body.verdict, "WA");
  assert.equal(body.passedTests, 0);
});

test("submit does not save a wrong-answer score when Judge0 is unavailable", async (t) => {
  t.after(() => t.mock.restoreAll());
  t.mock.method(prisma.match, "findUnique", async () => ({ status: "active", winnerRole: null }));
  t.mock.method(prisma.problem, "findUnique", async () => ({ rawJson: {
    functionSignature: { name: "answer", params: [], returnType: "number[]" },
    testCases: [{ args: [], expectedOutput: [1, 2], isHidden: false }],
  } }));
  const save = t.mock.method(prisma.submission, "create", async () => { throw new Error("Must not save"); });
  t.mock.method(globalThis, "fetch", async () => new Response("Unauthorized", { status: 401 }));
  const res = await POST(request("service-test"));
  assert.equal(res.status, 502);
  assert.equal(save.mock.callCount(), 0);
});
