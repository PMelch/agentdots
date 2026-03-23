import { homedir } from "node:os";
import { join } from "node:path";
import { access } from "node:fs/promises";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which } from "../shell.js";

export const rooCodeDetector: AgentDetector = {
  id: "roo-code",
  async detect(): Promise<AgentInfo> {
    // Roo Code is primarily a VS Code extension — check for its config dirs
    let installed = false;
    const knownPaths = [
      join(homedir(), ".roo"),
      ".roo",
      ".roomodes",
      ".roorules",
    ];

    for (const p of knownPaths) {
      try {
        await access(p);
        installed = true;
        break;
      } catch {
        // not found
      }
    }

    // Also check for CLI binary
    const binaryPath = await which("roo");
    if (binaryPath) installed = true;

    return {
      id: "roo-code",
      name: "Roo Code",
      installed,
      version: undefined,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), ".roo"),
        ".roo",
        ".roomodes",
        ".roorules",
      ],
      configFormat: "json",
      capabilities: ["mcp", "rules", "commands"],
    };
  },
};
