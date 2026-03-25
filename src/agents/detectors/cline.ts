import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const clineDetector: AgentDetector = {
  id: "cline",
  async detectInstalled(): Promise<AgentInfo> {
    const binaryPath = await which("cline");

    return {
      id: "cline",
      name: "Cline",
      installed: binaryPath !== null,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), "Library", "Application Support", "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings"),
        ".clinerules",
      ],
      configFormat: "json",
      capabilities: ["mcp", "rules"],
    };
  },
  async detect(): Promise<AgentInfo> {
    const info = await this.detectInstalled();
    const version = info.installed ? await getVersion("cline") ?? undefined : undefined;
    return { ...info, version };
  },
};
