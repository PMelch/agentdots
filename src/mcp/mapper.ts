import { homedir } from "node:os";
import { join } from "node:path";
import type { McpMapper, McpServerConfig } from "./types.js";

// --- Shared helpers ---

interface RawServerEntry {
  type?: string;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
  disabled?: boolean;
  timeout?: number;
  tools?: string[];
}

function parseServerEntry(name: string, entry: RawServerEntry): McpServerConfig {
  const isHttp = entry.type === "http" || entry.url !== undefined;
  const config: McpServerConfig = {
    name,
    transport: isHttp ? "http" : "stdio",
  };
  if (isHttp) {
    if (entry.url) config.url = entry.url;
    if (entry.headers) config.headers = entry.headers;
  } else {
    if (entry.command) config.command = entry.command;
    if (entry.args) config.args = entry.args;
  }
  if (entry.env && Object.keys(entry.env).length > 0) config.env = entry.env;
  if (entry.disabled !== undefined) config.disabled = entry.disabled;
  return config;
}

function parseMcpServersWrapper(raw: Record<string, unknown>): McpServerConfig[] {
  const servers = (raw.mcpServers ?? raw) as Record<string, RawServerEntry>;
  const configs: McpServerConfig[] = [];
  for (const [name, entry] of Object.entries(servers)) {
    if (typeof entry !== "object" || entry === null) continue;
    configs.push(parseServerEntry(name, entry));
  }
  return configs;
}

function buildMcpServersWrapper(configs: McpServerConfig[]): Record<string, unknown> {
  const mcpServers: Record<string, Record<string, unknown>> = {};
  for (const config of configs) {
    if (config.transport === "http") {
      const entry: Record<string, unknown> = { type: "http" };
      if (config.url) entry.url = config.url;
      if (config.headers) entry.headers = config.headers;
      if (config.env) entry.env = config.env;
      mcpServers[config.name] = entry;
    } else {
      const entry: Record<string, unknown> = {};
      if (config.command) entry.command = config.command;
      if (config.args) entry.args = config.args;
      if (config.env) entry.env = config.env;
      mcpServers[config.name] = entry;
    }
  }
  return { mcpServers };
}

// --- Claude Code ---

export const claudeCodeMapper: McpMapper = {
  agentId: "claude-code",

  toUnified(raw: Record<string, unknown>): McpServerConfig[] {
    // Claude has two formats:
    // 1. { mcpServers: { ... } } — standard local servers
    // 2. { "name": { type: "http", ... } } — plugin/http format (no wrapper)
    if (raw.mcpServers) {
      return parseMcpServersWrapper(raw);
    }
    // Top-level entries (plugin format)
    return parseMcpServersWrapper(raw);
  },

  fromUnified(configs: McpServerConfig[]): Record<string, unknown> {
    return buildMcpServersWrapper(configs);
  },

  configPath(scope: "global" | "project"): string {
    return scope === "global"
      ? join(homedir(), ".claude", "mcp.json")
      : join(".claude", "mcp.json");
  },
};

// --- Cursor ---

export const cursorMapper: McpMapper = {
  agentId: "cursor",

  toUnified(raw: Record<string, unknown>): McpServerConfig[] {
    return parseMcpServersWrapper(raw);
  },

  fromUnified(configs: McpServerConfig[]): Record<string, unknown> {
    return buildMcpServersWrapper(configs);
  },

  configPath(scope: "global" | "project"): string {
    return scope === "global"
      ? join(homedir(), ".cursor", "mcp.json")
      : join(".cursor", "mcp.json");
  },
};

// --- GitHub Copilot ---

export const copilotMapper: McpMapper = {
  agentId: "copilot",

  toUnified(raw: Record<string, unknown>): McpServerConfig[] {
    return parseMcpServersWrapper(raw);
  },

  fromUnified(configs: McpServerConfig[]): Record<string, unknown> {
    return buildMcpServersWrapper(configs);
  },

  configPath(scope: "global" | "project"): string {
    return scope === "global"
      ? join(homedir(), ".copilot", "mcp-config.json")
      : join(".copilot", "mcp-config.json");
  },
};

// --- Gemini CLI ---

export const geminiMapper: McpMapper = {
  agentId: "gemini",

  toUnified(raw: Record<string, unknown>): McpServerConfig[] {
    return parseMcpServersWrapper(raw);
  },

  fromUnified(configs: McpServerConfig[]): Record<string, unknown> {
    return buildMcpServersWrapper(configs);
  },

  configPath(scope: "global" | "project"): string {
    return scope === "global"
      ? join(homedir(), ".gemini", "settings.json")
      : join(".gemini", "settings.json");
  },
};

// --- OpenCode ---

export const opencodeMapper: McpMapper = {
  agentId: "opencode",

  toUnified(raw: Record<string, unknown>): McpServerConfig[] {
    return parseMcpServersWrapper(raw);
  },

  fromUnified(configs: McpServerConfig[]): Record<string, unknown> {
    return buildMcpServersWrapper(configs);
  },

  configPath(scope: "global" | "project"): string {
    return scope === "global"
      ? join(homedir(), ".opencode", "mcp.json")
      : join(".opencode", "mcp.json");
  },
};

// --- Windsurf ---

export const windsurfMapper: McpMapper = {
  agentId: "windsurf",

  toUnified(raw: Record<string, unknown>): McpServerConfig[] {
    return parseMcpServersWrapper(raw);
  },

  fromUnified(configs: McpServerConfig[]): Record<string, unknown> {
    return buildMcpServersWrapper(configs);
  },

  configPath(scope: "global" | "project"): string {
    return scope === "global"
      ? join(homedir(), ".codeium", "windsurf", "mcp_config.json")
      : join(".windsurf", "mcp_config.json");
  },
};

// --- Codex ---

export const codexMapper: McpMapper = {
  agentId: "codex",

  toUnified(raw: Record<string, unknown>): McpServerConfig[] {
    return parseMcpServersWrapper(raw);
  },

  fromUnified(configs: McpServerConfig[]): Record<string, unknown> {
    return buildMcpServersWrapper(configs);
  },

  configPath(scope: "global" | "project"): string {
    return scope === "global"
      ? join(homedir(), ".codex", "mcp.json")
      : join(".codex", "mcp.json");
  },
};

// --- Registry ---

const mappers = new Map<string, McpMapper>([
  ["claude-code", claudeCodeMapper],
  ["cursor", cursorMapper],
  ["copilot", copilotMapper],
  ["gemini", geminiMapper],
  ["opencode", opencodeMapper],
  ["windsurf", windsurfMapper],
  ["codex", codexMapper],
]);

export function getMapper(agentId: string): McpMapper | undefined {
  return mappers.get(agentId);
}
