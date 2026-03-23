import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkUpdates, resolveUpdateCommand, detectPackageManager } from "../../src/updates/checker.js";
import type { AgentInfo } from "../../src/core/types.js";
import type { UpdateProvider } from "../../src/updates/types.js";

function makeAgent(id: string, version?: string, binaryPath?: string): AgentInfo {
  return {
    id,
    name: id,
    installed: true,
    version,
    binaryPath,
    configPaths: [],
    configFormat: "json",
    capabilities: [],
  };
}

function makeProvider(agentId: string, latest: string | undefined, packageName = "some-pkg"): UpdateProvider {
  return {
    agentId,
    source: { type: "npm", packageName },
    async fetchLatest() {
      return latest;
    },
  };
}

describe("detectPackageManager", () => {
  it("returns npm for undefined", () => {
    assert.equal(detectPackageManager(undefined), "npm");
  });

  it("returns npm for nvm paths", () => {
    assert.equal(detectPackageManager("/Users/me/.nvm/versions/node/v22.0.0/bin/codex"), "npm");
  });

  it("returns npm for volta paths", () => {
    assert.equal(detectPackageManager("/Users/me/.volta/bin/codex"), "npm");
  });

  it("returns bun for .bun paths", () => {
    assert.equal(detectPackageManager("/Users/me/.bun/bin/codex"), "bun");
  });

  it("returns brew for /opt/homebrew paths", () => {
    assert.equal(detectPackageManager("/opt/homebrew/bin/gemini"), "brew");
  });

  it("returns brew for /usr/local/Cellar paths", () => {
    assert.equal(detectPackageManager("/usr/local/Cellar/gemini-cli/0.34.0/bin/gemini"), "brew");
  });

  it("returns snap for /snap paths", () => {
    assert.equal(detectPackageManager("/snap/bin/some-agent"), "snap");
  });

  it("returns npm for /usr/local/bin (plain node install)", () => {
    assert.equal(detectPackageManager("/usr/local/bin/codex"), "npm");
  });
});

describe("resolveUpdateCommand", () => {
  it("uses npm for non-bun binary paths", () => {
    const cmd = resolveUpdateCommand({ type: "npm", packageName: "@openai/codex" }, "/usr/local/bin/codex");
    assert.equal(cmd, "npm install -g @openai/codex@latest");
  });

  it("uses bun when binary path contains .bun", () => {
    const cmd = resolveUpdateCommand({ type: "npm", packageName: "@openai/codex" }, "/Users/me/.bun/bin/codex");
    assert.equal(cmd, "bun install -g @openai/codex@latest");
  });

  it("uses brew upgrade with alias when binary is from Homebrew", () => {
    const cmd = resolveUpdateCommand(
      { type: "npm", packageName: "@google/gemini-cli", aliases: { brew: "gemini-cli" } },
      "/opt/homebrew/bin/gemini",
    );
    assert.equal(cmd, "brew upgrade gemini-cli");
  });

  it("uses brew upgrade with npm packageName when no alias", () => {
    const cmd = resolveUpdateCommand(
      { type: "npm", packageName: "@openai/codex" },
      "/opt/homebrew/bin/codex",
    );
    assert.equal(cmd, "brew upgrade @openai/codex");
  });

  it("uses snap refresh for /snap paths", () => {
    const cmd = resolveUpdateCommand(
      { type: "npm", packageName: "some-pkg", aliases: { snap: "some-snap" } },
      "/snap/bin/some-agent",
    );
    assert.equal(cmd, "sudo snap refresh some-snap");
  });

  it("uses npm when binaryPath is undefined", () => {
    const cmd = resolveUpdateCommand({ type: "npm", packageName: "some-pkg" }, undefined);
    assert.equal(cmd, "npm install -g some-pkg@latest");
  });

  it("uses pip for pip source", () => {
    const cmd = resolveUpdateCommand({ type: "pip", packageName: "aider-chat" }, "/usr/local/bin/aider");
    assert.equal(cmd, "pip install --upgrade aider-chat");
  });

  it("returns custom updateCommand for custom source", () => {
    const cmd = resolveUpdateCommand({ type: "custom", updateCommand: "brew upgrade thing" }, "/opt/homebrew/bin/thing");
    assert.equal(cmd, "brew upgrade thing");
  });

  it("returns undefined for custom source without updateCommand", () => {
    const cmd = resolveUpdateCommand({ type: "custom" }, "/some/path");
    assert.equal(cmd, undefined);
  });
});

describe("checkUpdates", () => {
  it("detects an available update with npm", async () => {
    const agents = [makeAgent("claude-code", "1.0.0", "/Users/me/.nvm/versions/node/v22/bin/claude")];
    const providers = [makeProvider("claude-code", "1.1.0", "@anthropic-ai/claude-code")];
    const results = await checkUpdates(agents, providers);

    assert.equal(results.length, 1);
    assert.equal(results[0].hasUpdate, true);
    assert.equal(results[0].updateCommand, "npm install -g @anthropic-ai/claude-code@latest");
  });

  it("uses bun when agent was installed via bun", async () => {
    const agents = [makeAgent("codex", "0.1.0", "/Users/me/.bun/bin/codex")];
    const providers = [makeProvider("codex", "0.2.0", "@openai/codex")];
    const results = await checkUpdates(agents, providers);

    assert.equal(results[0].hasUpdate, true);
    assert.equal(results[0].updateCommand, "bun install -g @openai/codex@latest");
  });

  it("uses brew when agent was installed via Homebrew", async () => {
    const agents = [makeAgent("gemini", "0.26.0", "/opt/homebrew/bin/gemini")];
    const providers: UpdateProvider[] = [{
      agentId: "gemini",
      source: { type: "npm", packageName: "@google/gemini-cli", aliases: { brew: "gemini-cli" } },
      async fetchLatest() { return "0.34.0"; },
    }];
    const results = await checkUpdates(agents, providers);

    assert.equal(results[0].hasUpdate, true);
    assert.equal(results[0].updateCommand, "brew upgrade gemini-cli");
  });

  it("reports up to date when versions match", async () => {
    const agents = [makeAgent("aider", "0.72.0")];
    const providers: UpdateProvider[] = [{
      agentId: "aider",
      source: { type: "pip", packageName: "aider-chat" },
      async fetchLatest() { return "0.72.0"; },
    }];
    const results = await checkUpdates(agents, providers);

    assert.equal(results[0].hasUpdate, false);
    assert.equal(results[0].updateCommand, "pip install --upgrade aider-chat");
  });

  it("skips agents with no matching provider", async () => {
    const agents = [makeAgent("cursor", "1.0.0"), makeAgent("claude-code", "1.0.0")];
    const providers = [makeProvider("claude-code", "1.1.0")];
    const results = await checkUpdates(agents, providers);

    assert.equal(results.length, 1);
    assert.equal(results[0].agentId, "claude-code");
  });

  it("handles provider returning undefined (fetch failure)", async () => {
    const agents = [makeAgent("codex", "0.1.0")];
    const providers = [makeProvider("codex", undefined)];
    const results = await checkUpdates(agents, providers);

    assert.equal(results.length, 1);
    assert.equal(results[0].hasUpdate, false);
    assert.equal(results[0].latestVersion, undefined);
  });

  it("returns empty array when no agents provided", async () => {
    const results = await checkUpdates([], []);
    assert.deepEqual(results, []);
  });
});
