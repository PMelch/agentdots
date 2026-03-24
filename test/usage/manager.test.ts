import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getUsage, getAllUsage } from "../../src/usage/manager.js";

describe("getUsage", () => {
  it("returns UsageInfo shape for claude-code", async () => {
    const u = await getUsage("claude-code");
    assert.equal(u.agentId, "claude-code");
    assert.equal(u.agentName, "Claude Code");
    assert.ok(typeof u.available === "boolean");
    assert.ok(typeof u.source === "string");
  });

  it("returns UsageInfo shape for codex", async () => {
    const u = await getUsage("codex");
    assert.equal(u.agentId, "codex");
    assert.ok(u.agentName.toLowerCase().includes("codex"));
    assert.ok(typeof u.available === "boolean");
    assert.ok(typeof u.source === "string");
  });

  it("returns unavailable for unknown agent", async () => {
    const u = await getUsage("nonexistent-agent-xyz");
    assert.equal(u.available, false);
    assert.equal(u.source, "unavailable");
    assert.equal(u.agentId, "nonexistent-agent-xyz");
  });

  it("when available, tokens have required fields", async () => {
    const u = await getUsage("claude-code");
    if (u.available && u.tokens) {
      assert.ok(typeof u.tokens.input === "number");
      assert.ok(typeof u.tokens.output === "number");
      assert.ok(typeof u.tokens.total === "number");
      assert.equal(u.tokens.total, u.tokens.input + u.tokens.output);
    }
  });

  it("when available, cost has required fields", async () => {
    const u = await getUsage("claude-code");
    if (u.available && u.cost) {
      assert.ok(typeof u.cost.estimated === "number");
      assert.ok(typeof u.cost.currency === "string");
    }
  });
});

describe("getAllUsage", () => {
  it("returns array", async () => {
    const results = await getAllUsage();
    assert.ok(Array.isArray(results));
  });

  it("includes claude-code and codex entries", async () => {
    const results = await getAllUsage();
    const ids = results.map((r) => r.agentId);
    assert.ok(ids.includes("claude-code"));
    assert.ok(ids.includes("codex"));
  });

  it("all entries have required fields", async () => {
    const results = await getAllUsage();
    for (const u of results) {
      assert.ok(typeof u.agentId === "string");
      assert.ok(typeof u.agentName === "string");
      assert.ok(typeof u.available === "boolean");
      assert.ok(typeof u.source === "string");
    }
  });
});
