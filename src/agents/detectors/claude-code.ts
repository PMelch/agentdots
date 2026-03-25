import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const claudeCodeDetector: AgentDetector = {
  id: "claude-code",
  async detectInstalled(): Promise<AgentInfo> {
    const binaryPath = await which("claude");

    return {
      id: "claude-code",
      name: "Claude Code",
      installed: binaryPath !== null,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), ".claude"),
        ".claude",
      ],
      configFormat: "json",
      capabilities: ["mcp", "rules", "skills", "commands", "memory"],
    };
  },
  async detect(): Promise<AgentInfo> {
    const info = await this.detectInstalled();
    const version = info.installed ? await getVersion("claude") ?? undefined : undefined;
    return { ...info, version };
  },
};
