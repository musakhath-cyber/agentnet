import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agentId, isPrefixedId, newId, taskId, ulid } from "./ids.ts";

describe("ids", () => {
  it("ulid is 26 crockford chars", () => {
    const id = ulid(1_700_000_000_000);
    assert.equal(id.length, 26);
    assert.match(id, /^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("is time-sortable", () => {
    const a = ulid(1_700_000_000_000);
    const b = ulid(1_800_000_000_000);
    assert.equal(a < b, true);
  });

  it("agent and task prefixes validate", () => {
    const a = agentId();
    const t = taskId();
    assert.equal(isPrefixedId(a, "agent"), true);
    assert.equal(isPrefixedId(t, "task"), true);
    assert.equal(isPrefixedId(a, "task"), false);
    assert.equal(isPrefixedId("agent_nope", "agent"), false);
  });

  it("newId uses the given prefix", () => {
    const id = newId("key");
    assert.equal(id.startsWith("key_"), true);
    assert.equal(isPrefixedId(id, "key"), true);
  });
});
