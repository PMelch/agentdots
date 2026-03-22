import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { McpServerConfig } from "../../dist/mcp/types.js";

let tempDir: string;

async function setup() {
  tempDir = await mkdtemp(join(tmpdir(), "agentdots-mcp-test-"));
}

async function teardown() {
  await rm(tempDir, { recursive: true, force: true });
}

function makeConfig(name: string, command = "npx"): McpServerConfig {
  return {
    name,
    transport: "stdio" as const,
    command,
    args: ["-y", `@test/${name}`],
  };
}

describe("McpManager", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("loadConfigs reads JSON files from a directory", async () => {
    const { McpManager } = await import("../../dist/mcp/manager.js");
    const configDir = join(tempDir, "mcp");
    await mkdir(configDir, { recursive: true });

    const serverConfig = {
      name: "my-server",
      transport: "stdio",
      command: "npx",
      args: ["-y", "@test/mcp"],
    };
    await writeFile(join(configDir, "my-server.json"), JSON.stringify(serverConfig));

    const manager = new McpManager(configDir);
    const configs = await manager.loadConfigs();
    assert.equal(configs.length, 1);
    assert.equal(configs[0].name, "my-server");
    assert.equal(configs[0].transport, "stdio");
    assert.equal(configs[0].command, "npx");
  });

  it("loadConfigs returns empty array for missing directory", async () => {
    const { McpManager } = await import("../../dist/mcp/manager.js");
    const manager = new McpManager(join(tempDir, "nonexistent"));
    const configs = await manager.loadConfigs();
    assert.deepEqual(configs, []);
  });

  it("loadConfigs reads multiple config files", async () => {
    const { McpManager } = await import("../../dist/mcp/manager.js");
    const configDir = join(tempDir, "mcp");
    await mkdir(configDir, { recursive: true });

    await writeFile(join(configDir, "server-a.json"), JSON.stringify(makeConfig("server-a")));
    await writeFile(join(configDir, "server-b.json"), JSON.stringify(makeConfig("server-b")));

    const manager = new McpManager(configDir);
    const configs = await manager.loadConfigs();
    assert.equal(configs.length, 2);
    const names = configs.map((c) => c.name).sort();
    assert.deepEqual(names, ["server-a", "server-b"]);
  });

  it("saveConfig writes a server config to JSON file", async () => {
    const { McpManager } = await import("../../dist/mcp/manager.js");
    const configDir = join(tempDir, "mcp");
    const manager = new McpManager(configDir);

    await manager.saveConfig(makeConfig("new-server"));

    const content = await readFile(join(configDir, "new-server.json"), "utf-8");
    const parsed = JSON.parse(content);
    assert.equal(parsed.name, "new-server");
    assert.equal(parsed.command, "npx");
  });

  it("buildAgentConfig generates agent-specific config from unified configs", async () => {
    const { McpManager } = await import("../../dist/mcp/manager.js");
    const configDir = join(tempDir, "mcp");
    await mkdir(configDir, { recursive: true });
    await writeFile(join(configDir, "srv.json"), JSON.stringify(makeConfig("srv")));

    const manager = new McpManager(configDir);
    const agentConfig = await manager.buildAgentConfig("claude-code");
    const servers = (agentConfig as Record<string, unknown>).mcpServers as Record<string, unknown>;
    assert.ok(servers);
    assert.ok(servers["srv"]);
  });

  it("buildAgentConfig throws for non-MCP agent", async () => {
    const { McpManager } = await import("../../dist/mcp/manager.js");
    const manager = new McpManager(join(tempDir, "mcp"));
    await assert.rejects(() => manager.buildAgentConfig("aider"), /no MCP mapper/i);
  });

  it("diff returns changes between current and desired config", async () => {
    const { McpManager } = await import("../../dist/mcp/manager.js");
    const configDir = join(tempDir, "mcp");
    await mkdir(configDir, { recursive: true });
    await writeFile(join(configDir, "srv.json"), JSON.stringify(makeConfig("srv")));

    const manager = new McpManager(configDir);
    const currentConfig = { mcpServers: {} };
    const diffResult = await manager.diff("claude-code", currentConfig);
    assert.ok(diffResult.hasChanges);
    assert.ok(diffResult.added.length > 0);
    assert.equal(diffResult.added[0], "srv");
  });

  it("diff reports no changes when configs match", async () => {
    const { McpManager } = await import("../../dist/mcp/manager.js");
    const configDir = join(tempDir, "mcp");
    await mkdir(configDir, { recursive: true });
    await writeFile(join(configDir, "srv.json"), JSON.stringify(makeConfig("srv")));

    const manager = new McpManager(configDir);
    const desiredConfig = await manager.buildAgentConfig("claude-code");
    const diffResult = await manager.diff("claude-code", desiredConfig);
    assert.equal(diffResult.hasChanges, false);
    assert.equal(diffResult.added.length, 0);
    assert.equal(diffResult.removed.length, 0);
  });

  it("diff detects removed servers", async () => {
    const { McpManager } = await import("../../dist/mcp/manager.js");
    const configDir = join(tempDir, "mcp");
    await mkdir(configDir, { recursive: true });
    // Empty agentdots config
    const manager = new McpManager(configDir);

    const currentConfig = {
      mcpServers: { "old-server": { command: "node", args: ["old.js"] } },
    };
    const diffResult = await manager.diff("claude-code", currentConfig);
    assert.ok(diffResult.hasChanges);
    assert.ok(diffResult.removed.length > 0);
    assert.equal(diffResult.removed[0], "old-server");
  });
});
