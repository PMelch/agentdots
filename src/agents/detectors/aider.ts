import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const aiderDetector: AgentDetector = {
  id: "aider",
  async detect(): Promise<AgentInfo> {
    const binaryPath = await which("aider");
    const installed = binaryPath !== null;
    const version = installed ? await getVersion("aider") ?? undefined : undefined;

    return {
      id: "aider",
      name: "Aider",
      installed,
      version,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), ".aider"),
        ".aider.conf.yml",
      ],
      configFormat: "yaml",
      capabilities: ["rules"],
    };
  },
};
