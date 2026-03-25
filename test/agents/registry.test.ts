import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AgentRegistry } from "../../src/agents/registry.ts";
import type { AgentDetector, AgentInfo } from "../../src/core/types.ts";

function mockDetector(id: string, installed: boolean): AgentDetector {
  return {
    id,
    async detectInstalled(): Promise<AgentInfo> {
      return {
        id,
        name: `Mock ${id}`,
        installed,
        configPaths: [],
        configFormat: "json",
        capabilities: ["rules"],
      };
    },
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

  it("detectInstalledAll uses the fast detector path without full detection", async () => {
    let installedCalls = 0;
    let fullCalls = 0;

    const reg = new AgentRegistry([
      {
        id: "alpha",
        async detectInstalled(): Promise<AgentInfo> {
          installedCalls += 1;
          return {
            id: "alpha",
            name: "Mock alpha",
            installed: true,
            configPaths: [],
            configFormat: "json",
            capabilities: ["rules"],
          };
        },
        async detect(): Promise<AgentInfo> {
          fullCalls += 1;
          return {
            id: "alpha",
            name: "Mock alpha",
            installed: true,
            version: "9.9.9",
            configPaths: [],
            configFormat: "json",
            capabilities: ["rules"],
          };
        },
      },
    ]);

    const results = await reg.detectInstalledAll();
    assert.equal(results.length, 1);
    assert.equal(results[0].version, undefined);
    assert.equal(installedCalls, 1);
    assert.equal(fullCalls, 0);
  });
});
