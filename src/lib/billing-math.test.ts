import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateMonthly } from "./billing-math.ts";

describe("billing math", () => {
  it("adds per-agent cents onto the base", () => {
    assert.equal(estimateMonthly({ agents: 10, priceCents: 0, perAgentCents: 50 }), 500);
    assert.equal(estimateMonthly({ agents: 2, priceCents: 49900, perAgentCents: 0 }), 49900);
  });
});
