import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const geminiDetector: AgentDetector = {
  id: "gemini",
  async detectInstalled(): Promise<AgentInfo> {
    const binaryPath = await which("gemini");

    return {
      id: "gemini",
      name: "Gemini CLI",
      installed: binaryPath !== null,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), ".gemini"),
        "GEMINI.md",
      ],
      configFormat: "markdown",
      capabilities: ["rules"],
    };
  },
  async detect(): Promise<AgentInfo> {
    const info = await this.detectInstalled();
    const version = info.installed ? await getVersion("gemini") ?? undefined : undefined;
    return { ...info, version };
  },
};
