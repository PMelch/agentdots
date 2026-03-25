export type AgentCapability = "mcp" | "rules" | "skills" | "commands" | "memory";

export type ConfigFormat = "json" | "yaml" | "toml" | "markdown" | "custom";

export interface AgentInfo {
  id: string;
  name: string;
  installed: boolean;
  version?: string;
  binaryPath?: string;
  configPaths: string[];
  configFormat: ConfigFormat;
  capabilities: AgentCapability[];
}

export interface AgentDetector {
  id: string;
  detectInstalled(): Promise<AgentInfo>;
  detect(): Promise<AgentInfo>;
}
