import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { consumeRateLimit, limitForPlan } from "./rate-limit.ts";

describe("rate-limit", () => {
  it("maps plans to request budgets", () => {
    assert.equal(limitForPlan("free"), 60);
    assert.equal(limitForPlan("pro"), 600);
    assert.equal(limitForPlan("unknown"), 60);
  });

  it("enforces an in-memory window", async () => {
    const sql = { query: async () => [] };
    const key = `test:${Date.now()}:${Math.random()}`;
    for (let i = 0; i < 3; i += 1) {
      const r = await consumeRateLimit(sql as never, key, 3);
      assert.equal(r.ok, true);
    }
    const blocked = await consumeRateLimit(sql as never, key, 3);
    assert.equal(blocked.ok, false);
  });
});
