import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AgentRegistry } from "../../dist/agents/registry.js";
import type { AgentDetector, AgentInfo } from "../../dist/core/types.js";

function mockDetector(id: string, installed: boolean): AgentDetector {
  return {
    id,
    async detect(): Promise<AgentInfo> {
      return {
        id,
        name: `Mock ${id}`,
        installed,
        configPaths: [],
        configFormat: "json",
        capabilities: ["rules"],
      };
    },
  };
}

describe("AgentRegistry", () => {
  it("detectAll returns all detectors", async () => {
    const reg = new AgentRegistry([
      mockDetector("alpha", true),
      mockDetector("beta", false),
    ]);
    const results = await reg.detectAll();
    assert.equal(results.length, 2);
    assert.equal(results[0].id, "alpha");
    assert.equal(results[1].id, "beta");
  });

  it("detect returns agent by id", async () => {
    const reg = new AgentRegistry([
      mockDetector("alpha", true),
      mockDetector("beta", false),
    ]);
    const agent = await reg.detect("alpha");
    assert.ok(agent !== null);
    assert.equal(agent.id, "alpha");
    assert.equal(agent.installed, true);
  });

  it("detect returns null for unknown id", async () => {
    const reg = new AgentRegistry([mockDetector("alpha", true)]);
    const agent = await reg.detect("unknown");
    assert.equal(agent, null);
  });

  it("register adds a new detector", async () => {
    const reg = new AgentRegistry([]);
    reg.register(mockDetector("gamma", true));
    const results = await reg.detectAll();
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "gamma");
  });

  it("detectAll collects installed and not-installed", async () => {
    const reg = new AgentRegistry([
      mockDetector("a", true),
      mockDetector("b", false),
      mockDetector("c", true),
    ]);
    const results = await reg.detectAll();
    const installed = results.filter((r) => r.installed);
    assert.equal(installed.length, 2);
  });
});
