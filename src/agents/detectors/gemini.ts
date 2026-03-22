import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const geminiDetector: AgentDetector = {
  id: "gemini",
  async detect(): Promise<AgentInfo> {
    const binaryPath = await which("gemini");
    const installed = binaryPath !== null;
    const version = installed ? await getVersion("gemini") ?? undefined : undefined;

    return {
      id: "gemini",
      name: "Gemini CLI",
      installed,
      version,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), ".gemini"),
        "GEMINI.md",
      ],
      configFormat: "markdown",
      capabilities: ["rules"],
    };
  },
};
