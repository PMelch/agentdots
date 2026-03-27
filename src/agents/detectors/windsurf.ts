import { homedir } from "node:os";
import { join } from "node:path";
import { access } from "node:fs/promises";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which } from "../shell.js";

export const windsurfDetector: AgentDetector = {
  id: "windsurf",
  async detectInstalled(): Promise<AgentInfo> {
    let binaryPath = await which("windsurf");
    let installed = binaryPath !== null;

    if (!installed) {
      const knownPaths = [
        join(homedir(), ".codeium", "windsurf"),
        "/Applications/Windsurf.app",
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
    }

    return {
      id: "windsurf",
      name: "Windsurf",
      installed,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), ".codeium", "windsurf"),
        ".windsurf",
      ],
      configFormat: "json",
      capabilities: ["mcp", "rules", "skills", "commands"],
    };
  },
  async detect(): Promise<AgentInfo> {
    return this.detectInstalled();
  },
};
