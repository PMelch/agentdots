import { access } from "node:fs/promises";
import { join } from "node:path";
import type { AgentDetector, AgentInfo } from "../../core/types.js";

export const copilotDetector: AgentDetector = {
  id: "copilot",
  async detect(): Promise<AgentInfo> {
    const instructionsPath = join(".github", "copilot-instructions.md");
    let installed = false;
    try {
      await access(instructionsPath);
      installed = true;
    } catch {
      // not found
    }

    return {
      id: "copilot",
      name: "GitHub Copilot",
      installed,
      configPaths: [instructionsPath],
      configFormat: "markdown",
      capabilities: ["rules"],
    };
  },
};
