import { homedir } from "node:os";
import { join } from "node:path";
import { access } from "node:fs/promises";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const cursorDetector: AgentDetector = {
  id: "cursor",
  async detectInstalled(): Promise<AgentInfo> {
    let binaryPath = await which("cursor");
    let installed = binaryPath !== null;

    if (!installed) {
      // Cursor may be installed but not in PATH — check known locations
      const knownPaths = [
        join(homedir(), ".cursor"),
        "/Applications/Cursor.app",
        join(homedir(), "AppData", "Local", "Programs", "cursor", "Cursor.exe"),
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
      id: "cursor",
      name: "Cursor",
      installed,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), ".cursor"),
        ".cursor",
      ],
      configFormat: "json",
      capabilities: ["mcp", "rules", "skills", "commands"],
    };
  },
  async detect(): Promise<AgentInfo> {
    const info = await this.detectInstalled();
    const version = info.installed && info.binaryPath ? await getVersion("cursor") ?? undefined : undefined;
    return { ...info, version };
  },
};
