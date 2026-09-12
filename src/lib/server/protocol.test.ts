import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  envelope,
  executeHosted,
  extractInstruction,
  PROTOCOL,
  validateTaskInput,
} from "./protocol.ts";

describe("protocol", () => {
  it("builds a lattice/1 envelope", () => {
    const env = envelope("task.created", {
      id: "task_1",
      from: "a",
      to: "b",
      title: "Ping",
      input: { instruction: "hello" },
      status: "pending",
      created_at: "2026-01-01T00:00:00.000Z",
    });
    assert.equal(env.protocol, PROTOCOL);
    assert.equal(env.type, "task.created");
    assert.equal(env.task.title, "Ping");
  });

  it("extracts instruction from several shapes", () => {
    assert.equal(extractInstruction("plain"), "plain");
    assert.equal(extractInstruction({ instruction: "do it" }), "do it");
    assert.equal(extractInstruction({ query: "q" }), "q");
    assert.equal(extractInstruction({ payload: "p" }), "p");
  });

  it("echo executor round-trips payload", () => {
    const res = executeHosted("echo", { instruction: "ping" });
    assert.equal(res.ok, true);
    if (res.ok) {
      const result = res.result as { echo: { instruction: string } };
      assert.equal(result.echo.instruction, "ping");
    }
  });

  it("research executor returns outline", () => {
    const res = executeHosted("research", { query: "agent protocols" });
    assert.equal(res.ok, true);
    if (res.ok) {
      const result = res.result as { outline: string[]; query: string };
      assert.equal(result.query, "agent protocols");
      assert.equal(result.outline.length > 0, true);
    }
  });

  it("unknown kind fails closed", () => {
    const res = executeHosted("nope", {});
    assert.equal(res.ok, false);
  });

  it("rejects oversized input", () => {
    const big = "x".repeat(50_000);
    const res = validateTaskInput({ instruction: big });
    assert.equal(res.ok, false);
  });

  it("support classifier picks billing", () => {
    const res = executeHosted("support", { message: "I need a refund on my invoice" });
    assert.equal(res.ok, true);
    if (res.ok) {
      const result = res.result as { intent: string; urgency: string };
      assert.equal(result.intent, "billing");
    }
  });
});
