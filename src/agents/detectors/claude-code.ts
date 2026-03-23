import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const claudeCodeDetector: AgentDetector = {
  id: "claude-code",
  async detect(): Promise<AgentInfo> {
    const binaryPath = await which("claude");
    const installed = binaryPath !== null;
    const version = installed ? await getVersion("claude") ?? undefined : undefined;

    return {
      id: "claude-code",
      name: "Claude Code",
      installed,
      version,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), ".claude"),
        ".claude",
      ],
      configFormat: "json",
      capabilities: ["mcp", "rules", "skills", "commands", "memory"],
    };
  },
};
