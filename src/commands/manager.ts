import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { CommandDefinition, CommandsDiffResult } from "./types.js";
import { getMapper, getAllMappers } from "./mappers.js";

export class CommandsManager {
  constructor(private commandsDir: string) {}

  /** Load all .md command files from the commands directory */
  async loadCommands(scope: "global" | "project"): Promise<CommandDefinition[]> {
    let files: string[];
    try {
      const entries = await readdir(this.commandsDir);
      files = entries.filter((f) => f.endsWith(".md"));
    } catch {
      return [];
    }

    const commands: CommandDefinition[] = [];
    for (const file of files) {
      const filePath = join(this.commandsDir, file);
      const content = await readFile(filePath, "utf-8");
      commands.push({
        name: file.replace(/\.md$/, ""),
        content,
        scope,
        source: filePath,
      });
    }
    return commands;
  }

  /** Sync command files to a specific agent's commands directory */
  async syncToAgent(agentId: string, scope: "global" | "project"): Promise<string> {
    const mapper = getMapper(agentId);
    if (!mapper) {
      throw new Error(`No commands mapper for agent '${agentId}'`);
    }
    const targetDir = mapper.commandsPath(scope);
    if (!targetDir) {
      throw new Error(`Agent '${agentId}' does not support ${scope} commands`);
    }

    const commands = await this.loadCommands(scope);
    await mkdir(targetDir, { recursive: true });

    for (const cmd of commands) {
      const dest = join(targetDir, `${cmd.name}.md`);
      await writeFile(dest, cmd.content);
    }

    return targetDir;
  }

  /** Sync command files to all supported agents */
  async syncToAll(scope: "global" | "project"): Promise<string[]> {
    const commands = await this.loadCommands(scope);
    const synced: string[] = [];

    for (const mapper of getAllMappers()) {
      const targetDir = mapper.commandsPath(scope);
      if (!targetDir) continue;
      try {
        await mkdir(targetDir, { recursive: true });
        for (const cmd of commands) {
          const dest = join(targetDir, `${cmd.name}.md`);
          await writeFile(dest, cmd.content);
        }
        synced.push(mapper.agentId);
      } catch {
        // Skip agents that fail
      }
    }
    return synced;
  }

  /** Diff commands between source and agent's commands directory */
  async diff(agentId: string, scope: "global" | "project"): Promise<CommandsDiffResult> {
    const mapper = getMapper(agentId);
    if (!mapper) {
      throw new Error(`No commands mapper for agent '${agentId}'`);
    }
    const targetDir = mapper.commandsPath(scope);
    if (!targetDir) {
      throw new Error(`Agent '${agentId}' does not support ${scope} commands`);
    }

    const sourceCommands = await this.loadCommands(scope);
    const sourceMap = new Map(sourceCommands.map((c) => [c.name, c.content]));

    // Read existing agent commands
    let agentFiles: string[] = [];
    try {
      const entries = await readdir(targetDir);
      agentFiles = entries.filter((f) => f.endsWith(".md"));
    } catch {
      // Directory doesn't exist yet
    }

    const agentMap = new Map<string, string>();
    for (const file of agentFiles) {
      const content = await readFile(join(targetDir, file), "utf-8");
      agentMap.set(file.replace(/\.md$/, ""), content);
    }

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    for (const [name, content] of sourceMap) {
      if (!agentMap.has(name)) {
        added.push(name);
      } else if (agentMap.get(name) !== content) {
        modified.push(name);
      }
    }

    for (const name of agentMap.keys()) {
      if (!sourceMap.has(name)) {
        removed.push(name);
      }
    }

    return {
      hasChanges: added.length > 0 || removed.length > 0 || modified.length > 0,
      added,
      removed,
      modified,
    };
  }
}
