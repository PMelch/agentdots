import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const clineDetector: AgentDetector = {
  id: "cline",
  async detect(): Promise<AgentInfo> {
    const binaryPath = await which("cline");
    const installed = binaryPath !== null;
    const version = installed ? await getVersion("cline") ?? undefined : undefined;

    return {
      id: "cline",
      name: "Cline",
      installed,
      version,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), "Library", "Application Support", "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings"),
        ".clinerules",
      ],
      configFormat: "json",
      capabilities: ["mcp", "rules"],
    };
  },
};
