import assert from "node:assert/strict";
import { test } from "node:test";
const prisma = {
  match: { async findUnique() { throw new Error("Unmocked match read"); }, async updateMany(..._args: unknown[]) { return { count: 0 }; } },
  problem: { async findUnique() { throw new Error("Unmocked problem read"); } },
  submission: { async create() { throw new Error("Unmocked submission write"); } },
};
// Install a fake client before importing the route. No real database is used.
Object.assign(globalThis, { prisma });
async function POST(request: Request) {
  return (await import("../app/api/submit/route")).POST(request);
}

function request(id: string, role = "host") {
  return new Request("http://localhost/api/submit", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matchId: id, role, language: "rust", code: "fn answer() -> Vec<i64> { vec![1, 2] }" }),
  });
}

test("submit preserves Rust return types and does not expose hidden tests", async (t) => {
  t.after(() => t.mock.restoreAll());
  t.mock.method(prisma.match, "findUnique", async () => ({ status: "active", winnerRole: null, startedAt: new Date(), duelLanguage: "rust" }));
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

test("simultaneous accepted submissions claim one winner and send one notification", async (t) => {
  t.after(() => t.mock.restoreAll());
  const match = { status: "active", winnerRole: null as string | null, startedAt: new Date(), duelLanguage: "rust" };
  let claims = 0;
  let notifications = 0;
  t.mock.method(prisma.match, "findUnique", async () => ({ ...match }));
  t.mock.method(prisma.match, "updateMany", async (args: { where: Record<string, unknown>; data: { winnerRole: string } }) => {
    assert.equal(args.where.status, "active");
    assert.equal(args.where.winnerRole, null);
    if (match.status !== "active" || match.winnerRole) return { count: 0 };
    match.winnerRole = args.data.winnerRole; match.status = "finished"; claims++;
    return { count: 1 };
  });
  t.mock.method(prisma.problem, "findUnique", async () => ({ rawJson: {
    functionSignature: { name: "answer", params: [], returnType: "number[]" },
    testCases: [{ args: [], expectedOutput: [1, 2], isHidden: false }],
  } }));
  t.mock.method(prisma.submission, "create", async (args: { data: Record<string, unknown> }) => ({ id: "race-submission", ...args.data }));
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    if (String(input).includes("internal/match-ended")) { notifications++; return Response.json({ ok: true }); }
    return Response.json({ status: { id: 3, description: "Accepted" }, stdout: Buffer.from("[1,2]").toString("base64") });
  });
  const responses = await Promise.all([POST(request("race-test", "host")), POST(request("race-test", "guest"))]);
  assert.ok(responses.every(res => res.status === 200 || res.status === 409));
  assert.equal(claims, 1);
  assert.equal(notifications, 1);
  assert.ok(match.winnerRole === "host" || match.winnerRole === "guest");
});

test("inactive, expired, and wrong-language submissions do not reach Judge0", async (t) => {
  t.after(() => t.mock.restoreAll());
  let match = { status: "waiting", winnerRole: null, startedAt: new Date(), duelLanguage: "rust" };
  t.mock.method(prisma.match, "findUnique", async () => match);
  const judge = t.mock.method(globalThis, "fetch", async () => { throw new Error("Must not call Judge0"); });
  assert.equal((await POST(request("inactive-test"))).status, 409);
  match = { ...match, status: "active", startedAt: new Date(0) };
  assert.equal((await POST(request("expired-test"))).status, 409);
  match = { ...match, startedAt: new Date(), duelLanguage: "python" };
  assert.equal((await POST(request("language-test"))).status, 400);
  assert.equal(judge.mock.callCount(), 0);
});

test("submit refuses correct output from a failed execution", async (t) => {
  t.after(() => t.mock.restoreAll());
  t.mock.method(prisma.match, "findUnique", async () => ({ status: "active", winnerRole: null, startedAt: new Date(), duelLanguage: "rust" }));
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
  t.mock.method(prisma.match, "findUnique", async () => ({ status: "active", winnerRole: null, startedAt: new Date(), duelLanguage: "rust" }));
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
