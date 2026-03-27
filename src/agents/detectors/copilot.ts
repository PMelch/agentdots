import { access } from "node:fs/promises";
import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const copilotDetector: AgentDetector = {
  id: "copilot",
  async detectInstalled(): Promise<AgentInfo> {
    const instructionsPath = join(".github", "copilot-instructions.md");

    // Check for CLI binary (gh copilot or standalone copilot)
    let binaryPath = await which("copilot");
    let installed = binaryPath !== null;

    // Also check if gh copilot extension is available
    if (!installed) {
      const ghPath = await which("gh");
      if (ghPath) {
        // gh copilot is installed as a gh extension
        binaryPath = ghPath;
        installed = true;
      }
    }

    // Fallback: check for config file presence
    if (!installed) {
      try {
        await access(instructionsPath);
        installed = true;
      } catch {
        // not found
      }
    }

    return {
      id: "copilot",
      name: "GitHub Copilot",
      installed,
      binaryPath: binaryPath ?? undefined,
      configPaths: [instructionsPath],
      configFormat: "markdown",
      capabilities: ["rules", "skills"],
    };
  },
  async detect(): Promise<AgentInfo> {
    const info = await this.detectInstalled();
    const version = await which("copilot")
      ? await getVersion("copilot") ?? undefined
      : undefined;
    return { ...info, version };
  },
};
