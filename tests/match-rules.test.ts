import assert from "node:assert/strict";
import { test } from "node:test";
import { MATCH_DURATION_MS, matchDeadline, publicProblem } from "../lib/match-rules";
import { problemSeeds } from "../lib/problem-seeds";
import { competitiveProblemSchema } from "../lib/problem-schemas";

test("deadline remains fixed across reconnects and rejects invalid dates", () => {
  const start = new Date("2026-01-01T00:00:00Z");
  assert.equal(matchDeadline(start), start.getTime() + MATCH_DURATION_MS);
  assert.equal(matchDeadline(start.toISOString()), matchDeadline(start));
  assert.equal(matchDeadline(null), null);
  assert.equal(matchDeadline("invalid"), null);
});

test("all seeded problems have valid schemas and publish no tests or reference solutions", () => {
  for (const seed of problemSeeds) {
    assert.ok(competitiveProblemSchema.safeParse(seed).success, seed.title);
    const published = publicProblem({ title: seed.title, rawJson: seed });
    assert.equal("testCases" in published.rawJson, false);
    assert.equal("referenceSolution" in published.rawJson, false);
    assert.ok(published.rawJson.functionSignature);
  }
});
