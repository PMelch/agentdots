export type McpTransport = "stdio" | "http";

export interface McpServerConfig {
  name: string;
  transport: McpTransport;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
  disabled?: boolean;
}

/** Agent-specific MCP format mapper */
export interface McpMapper {
  agentId: string;
  /** Convert raw agent config JSON to unified format */
  toUnified(raw: Record<string, unknown>): McpServerConfig[];
  /** Convert unified configs to agent-specific format */
  fromUnified(configs: McpServerConfig[]): Record<string, unknown>;
  /** Resolve the MCP config file path for this agent */
  configPath(scope: "global" | "project"): string;
}
