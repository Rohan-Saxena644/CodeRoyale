import assert from "node:assert/strict";
import { test } from "node:test";

const prisma = { match: { async count(..._args: unknown[]): Promise<number> { throw new Error("Unmocked database access"); } } };
Object.assign(globalThis, { prisma });
async function getHealth() { return (await import("../app/api/health/route")).GET(); }

test("health reports operational dependencies and disables caching", async (t) => {
  t.after(() => t.mock.restoreAll());
  t.mock.method(prisma.match, "count", async (...args: unknown[]) => args.length ? 2 : 8);
  const res = await getHealth();
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(body.status, "operational");
  assert.equal(body.checks.database, "operational");
  assert.equal(body.totalMatches, 8);
  assert.equal(body.activeMatches, 2);
});

test("health keeps web liveness but reports database failure without leaking errors", async (t) => {
  t.after(() => t.mock.restoreAll());
  t.mock.method(prisma.match, "count", async () => { throw new Error("private connection details"); });
  const res = await getHealth();
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.status, "degraded");
  assert.equal(body.checks.web, "operational");
  assert.equal(body.checks.database, "unavailable");
  assert.equal(body.totalMatches, null);
  assert.equal(JSON.stringify(body).includes("private"), false);
});
