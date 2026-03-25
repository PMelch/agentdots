import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const aiderDetector: AgentDetector = {
  id: "aider",
  async detectInstalled(): Promise<AgentInfo> {
    const binaryPath = await which("aider");

    return {
      id: "aider",
      name: "Aider",
      installed: binaryPath !== null,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), ".aider"),
        ".aider.conf.yml",
      ],
      configFormat: "yaml",
      capabilities: ["rules"],
    };
  },
  async detect(): Promise<AgentInfo> {
    const info = await this.detectInstalled();
    const version = info.installed ? await getVersion("aider") ?? undefined : undefined;
    return { ...info, version };
  },
};
