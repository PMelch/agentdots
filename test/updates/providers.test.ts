import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getProvider, getAllProviders } from "../../src/updates/providers.js";

describe("getProvider", () => {
  it("returns a provider for claude-code", () => {
    const p = getProvider("claude-code");
    assert.ok(p);
    assert.equal(p.agentId, "claude-code");
    assert.ok(p.source);
    assert.equal(p.source.type, "npm");
    assert.ok(p.fetchLatest);
  });

  it("returns a provider for aider", () => {
    const p = getProvider("aider");
    assert.ok(p);
    assert.equal(p.agentId, "aider");
  });

  it("returns a provider for codex", () => {
    const p = getProvider("codex");
    assert.ok(p);
    assert.equal(p.agentId, "codex");
  });

  it("returns a provider for gemini", () => {
    const p = getProvider("gemini");
    assert.ok(p);
    assert.equal(p.agentId, "gemini");
  });

  it("returns undefined for unknown agent", () => {
    assert.equal(getProvider("unknown-agent"), undefined);
  });
});

describe("getAllProviders", () => {
  it("returns providers for all supported agents", () => {
    const providers = getAllProviders();
    assert.ok(providers.length > 0);
    const ids = providers.map((p) => p.agentId);
    assert.ok(ids.includes("claude-code"));
    assert.ok(ids.includes("aider"));
    assert.ok(ids.includes("codex"));
    assert.ok(ids.includes("gemini"));
  });

  it("every provider has required fields", () => {
    for (const p of getAllProviders()) {
      assert.ok(p.agentId, `${p.agentId} missing agentId`);
      assert.ok(typeof p.fetchLatest === "function", `${p.agentId} missing fetchLatest`);
    }
  });
});
