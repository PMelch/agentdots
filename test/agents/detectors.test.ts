import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Tests for individual detector shape/contract (not binary detection)
// We validate the detector contract without triggering slow version lookups.

describe("detector contracts", () => {
  const expectedDetectors = [
    { id: "claude-code", format: "json", capabilities: ["mcp", "rules", "skills", "commands", "memory"] },
    { id: "codex", format: "toml", capabilities: ["mcp", "rules"] },
    { id: "gemini", format: "markdown", capabilities: ["rules"] },
    { id: "cursor", format: "json", capabilities: ["mcp", "rules", "skills", "commands"] },
    { id: "copilot", format: "markdown", capabilities: ["rules"] },
    { id: "opencode", format: "json", capabilities: ["mcp", "rules"] },
    { id: "aider", format: "yaml", capabilities: ["rules"] },
    { id: "windsurf", format: "json", capabilities: ["mcp", "rules", "commands"] },
    { id: "pi", format: "custom", capabilities: ["rules"] },
  ];

  for (const expected of expectedDetectors) {
    it(`${expected.id}: detectInstalled() returns valid AgentInfo shape`, async () => {
      const mod = await import(`../../src/agents/detectors/${expected.id}.ts`);
      // Find the exported detector (it's the only export)
      const detector = Object.values(mod)[0] as {
        id: string;
        detectInstalled: () => Promise<unknown>;
      };

      assert.ok(typeof detector.detectInstalled === "function", "detectInstalled must be a function");
      assert.equal(detector.id, expected.id);

      const info = await detector.detectInstalled() as {
        id: string;
        name: string;
        installed: boolean;
        configPaths: string[];
        configFormat: string;
        capabilities: string[];
      };

      assert.equal(info.id, expected.id);
      assert.ok(typeof info.name === "string" && info.name.length > 0, "name must be non-empty string");
      assert.ok(typeof info.installed === "boolean", "installed must be boolean");
      assert.ok(Array.isArray(info.configPaths), "configPaths must be array");
      assert.equal(info.configFormat, expected.format);
      assert.deepEqual(info.capabilities, expected.capabilities);
    });
  }
});
