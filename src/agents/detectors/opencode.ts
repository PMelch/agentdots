import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const opencodeDetector: AgentDetector = {
  id: "opencode",
  async detect(): Promise<AgentInfo> {
    const binaryPath = await which("opencode");
    const installed = binaryPath !== null;
    const version = installed ? await getVersion("opencode") ?? undefined : undefined;

    return {
      id: "opencode",
      name: "OpenCode",
      installed,
      version,
      binaryPath: binaryPath ?? undefined,
      configPaths: [".opencode"],
      configFormat: "json",
      capabilities: ["mcp", "rules"],
    };
  },
};
