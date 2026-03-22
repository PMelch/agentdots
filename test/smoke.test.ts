import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("smoke", () => {
  it("imports core types", async () => {
    // Dynamic import to verify the module resolves correctly
    const mod = await import("../dist/core/types.js");
    // types.ts only exports type definitions, the module object should be defined
    assert.ok(mod !== undefined);
  });

  it("imports agent registry", async () => {
    const { registry, AgentRegistry } = await import("../dist/agents/registry.js");
    assert.ok(registry !== undefined);
    assert.ok(AgentRegistry !== undefined);
  });
});
