#!/usr/bin/env node
import { Command } from "commander";
import { registry } from "../agents/registry.js";

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

program.parse();
