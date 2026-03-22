import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const codexDetector: AgentDetector = {
  id: "codex",
  async detect(): Promise<AgentInfo> {
    const binaryPath = await which("codex");
    const installed = binaryPath !== null;
    const version = installed ? await getVersion("codex") ?? undefined : undefined;

    return {
      id: "codex",
      name: "OpenAI Codex CLI",
      installed,
      version,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), ".codex"),
      ],
      configFormat: "toml",
      capabilities: ["mcp", "rules"],
    };
  },
};
