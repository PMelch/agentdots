import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const codexDetector: AgentDetector = {
  id: "codex",
  async detectInstalled(): Promise<AgentInfo> {
    const binaryPath = await which("codex");

    return {
      id: "codex",
      name: "OpenAI Codex CLI",
      installed: binaryPath !== null,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), ".codex"),
      ],
      configFormat: "toml",
      capabilities: ["mcp", "rules"],
    };
  },
  async detect(): Promise<AgentInfo> {
    const info = await this.detectInstalled();
    const version = info.installed ? await getVersion("codex") ?? undefined : undefined;
    return { ...info, version };
  },
};
