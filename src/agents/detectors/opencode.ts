import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const opencodeDetector: AgentDetector = {
  id: "opencode",
  async detectInstalled(): Promise<AgentInfo> {
    const binaryPath = await which("opencode");

    return {
      id: "opencode",
      name: "OpenCode",
      installed: binaryPath !== null,
      binaryPath: binaryPath ?? undefined,
      configPaths: [".opencode"],
      configFormat: "json",
      capabilities: ["mcp", "rules", "skills"],
    };
  },
  async detect(): Promise<AgentInfo> {
    const info = await this.detectInstalled();
    const version = info.installed ? await getVersion("opencode") ?? undefined : undefined;
    return { ...info, version };
  },
};
