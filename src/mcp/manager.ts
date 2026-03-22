import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { McpServerConfig } from "./types.js";
import { getMapper } from "./mapper.js";

export interface DiffResult {
  hasChanges: boolean;
  added: string[];
  removed: string[];
  modified: string[];
}

export class McpManager {
  constructor(private configDir: string) {}

  /** Load all MCP server configs from the config directory */
  async loadConfigs(): Promise<McpServerConfig[]> {
    let files: string[];
    try {
      const entries = await readdir(this.configDir);
      files = entries.filter((f) => f.endsWith(".json"));
    } catch {
      return [];
    }

    const configs: McpServerConfig[] = [];
    for (const file of files) {
      const content = await readFile(join(this.configDir, file), "utf-8");
      const parsed = JSON.parse(content) as McpServerConfig;
      configs.push(parsed);
    }
    return configs;
  }

  /** Save a server config as a JSON file */
  async saveConfig(config: McpServerConfig): Promise<void> {
    await mkdir(this.configDir, { recursive: true });
    const filePath = join(this.configDir, `${config.name}.json`);
    await writeFile(filePath, JSON.stringify(config, null, 2));
  }

  /** Build the agent-specific config from all unified configs */
  async buildAgentConfig(agentId: string): Promise<Record<string, unknown>> {
    const mapper = getMapper(agentId);
    if (!mapper) {
      throw new Error(`No MCP mapper for agent '${agentId}'`);
    }
    const configs = await this.loadConfigs();
    return mapper.fromUnified(configs) as Record<string, unknown>;
  }

  /** Diff current agent config against desired config from agentdots */
  async diff(agentId: string, currentConfig: Record<string, unknown>): Promise<DiffResult> {
    const mapper = getMapper(agentId);
    if (!mapper) {
      throw new Error(`No MCP mapper for agent '${agentId}'`);
    }

    const desiredConfigs = await this.loadConfigs();
    const desiredRaw = mapper.fromUnified(desiredConfigs) as Record<string, unknown>;

    const currentServers = extractServerNames(currentConfig);
    const desiredServers = extractServerNames(desiredRaw);

    const added = desiredServers.filter((s) => !currentServers.includes(s));
    const removed = currentServers.filter((s) => !desiredServers.includes(s));

    // Check for modifications in shared servers
    const shared = desiredServers.filter((s) => currentServers.includes(s));
    const modified: string[] = [];
    const currentMcp = (currentConfig.mcpServers ?? currentConfig) as Record<string, unknown>;
    const desiredMcp = (desiredRaw.mcpServers ?? desiredRaw) as Record<string, unknown>;
    for (const name of shared) {
      if (JSON.stringify(currentMcp[name]) !== JSON.stringify(desiredMcp[name])) {
        modified.push(name);
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

function extractServerNames(config: Record<string, unknown>): string[] {
  const servers = (config.mcpServers ?? config) as Record<string, unknown>;
  return Object.keys(servers).filter((k) => typeof servers[k] === "object");
}
