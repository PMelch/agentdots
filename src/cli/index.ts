#!/usr/bin/env node
import { Command } from "commander";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { registry } from "../agents/registry.js";
import { McpManager } from "../mcp/manager.js";
import { getMapper } from "../mcp/mapper.js";

const program = new Command();

program
  .name("agentdots")
  .description("Unified AI Agent Config Manager")
  .version("0.1.0");

const agentsCmd = program
  .command("agents")
  .description("List or inspect detected AI agents")
  .argument("[id]", "Agent ID to inspect")
  .action(async (id?: string) => {
    if (id) {
      const agent = await registry.detect(id);
      if (!agent) {
        console.error(`Agent '${id}' not found.`);
        process.exit(1);
      }
      console.log(`\nAgent: ${agent.name} (${agent.id})`);
      console.log(`  Installed:    ${agent.installed}`);
      if (agent.version) console.log(`  Version:      ${agent.version}`);
      if (agent.binaryPath) console.log(`  Binary:       ${agent.binaryPath}`);
      console.log(`  Config format: ${agent.configFormat}`);
      console.log(`  Capabilities: ${agent.capabilities.join(", ") || "none"}`);
      console.log(`  Config paths:`);
      for (const p of agent.configPaths) {
        console.log(`    ${p}`);
      }
    } else {
      const agents = await registry.detectAll();
      const installed = agents.filter((a) => a.installed);
      const notInstalled = agents.filter((a) => !a.installed);

      console.log(`\nDetected agents (${installed.length}/${agents.length} installed):\n`);

      const col = (s: string, w: number) => s.padEnd(w).slice(0, w);
      const header = `${col("ID", 16)} ${col("NAME", 20)} ${col("INSTALLED", 10)} ${col("VERSION", 12)} CAPABILITIES`;
      console.log(header);
      console.log("-".repeat(header.length));

      for (const a of [...installed, ...notInstalled]) {
        console.log(
          `${col(a.id, 16)} ${col(a.name, 20)} ${col(String(a.installed), 10)} ${col(a.version ?? "-", 12)} ${a.capabilities.join(", ")}`
        );
      }
    }
  });

// --- MCP command ---

const mcpCmd = program
  .command("mcp")
  .description("Manage MCP server configurations");

mcpCmd
  .command("list")
  .description("List configured MCP servers")
  .option("-s, --scope <scope>", "Config scope: global or project", "global")
  .action(async (opts: { scope: string }) => {
    const configDir = opts.scope === "project"
      ? join(".agentdots", "mcp")
      : join(homedir(), ".agentdots", "mcp");

    const manager = new McpManager(configDir);
    const configs = await manager.loadConfigs();

    if (configs.length === 0) {
      console.log(`\nNo MCP servers configured (${opts.scope}).`);
      console.log(`Add configs to: ${configDir}/`);
      return;
    }

    console.log(`\nMCP servers (${opts.scope}, ${configs.length}):\n`);
    const col = (s: string, w: number) => s.padEnd(w).slice(0, w);
    const header = `${col("NAME", 24)} ${col("TRANSPORT", 10)} ${col("COMMAND/URL", 40)}`;
    console.log(header);
    console.log("-".repeat(header.length));

    for (const c of configs) {
      const target = c.transport === "http" ? (c.url ?? "-") : `${c.command ?? "-"} ${(c.args ?? []).join(" ")}`;
      console.log(`${col(c.name, 24)} ${col(c.transport, 10)} ${target}`);
    }
  });

mcpCmd
  .command("diff")
  .description("Show what would change when syncing to an agent")
  .argument("<agentId>", "Target agent ID")
  .option("-s, --scope <scope>", "Config scope: global or project", "global")
  .action(async (agentId: string, opts: { scope: string }) => {
    const mapper = getMapper(agentId);
    if (!mapper) {
      console.error(`Agent '${agentId}' does not support MCP.`);
      process.exit(1);
    }

    const configDir = opts.scope === "project"
      ? join(".agentdots", "mcp")
      : join(homedir(), ".agentdots", "mcp");

    const manager = new McpManager(configDir);

    // Try to read current agent config
    let currentConfig: Record<string, unknown> = {};
    const agentConfigPath = mapper.configPath(opts.scope as "global" | "project");
    try {
      const content = await readFile(agentConfigPath, "utf-8");
      currentConfig = JSON.parse(content);
    } catch {
      // No existing config
    }

    const result = await manager.diff(agentId, currentConfig);

    if (!result.hasChanges) {
      console.log(`\nNo changes for ${agentId}.`);
      return;
    }

    console.log(`\nChanges for ${agentId}:\n`);
    for (const name of result.added) console.log(`  + ${name}`);
    for (const name of result.removed) console.log(`  - ${name}`);
    for (const name of result.modified) console.log(`  ~ ${name}`);
  });

mcpCmd
  .command("sync")
  .description("Sync MCP configs to an agent")
  .argument("<agentId>", "Target agent ID")
  .option("-s, --scope <scope>", "Config scope: global or project", "global")
  .action(async (agentId: string, opts: { scope: string }) => {
    const mapper = getMapper(agentId);
    if (!mapper) {
      console.error(`Agent '${agentId}' does not support MCP.`);
      process.exit(1);
    }

    const configDir = opts.scope === "project"
      ? join(".agentdots", "mcp")
      : join(homedir(), ".agentdots", "mcp");

    const manager = new McpManager(configDir);
    const agentConfig = await manager.buildAgentConfig(agentId);
    const agentConfigPath = mapper.configPath(opts.scope as "global" | "project");

    // Ensure directory exists
    const { mkdir, writeFile: write } = await import("node:fs/promises");
    const { dirname } = await import("node:path");
    await mkdir(dirname(agentConfigPath), { recursive: true });
    await write(agentConfigPath, JSON.stringify(agentConfig, null, 2));

    console.log(`\nSynced MCP config to ${agentConfigPath}`);
  });

program.parse();
