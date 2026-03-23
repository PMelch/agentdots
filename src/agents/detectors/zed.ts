import { homedir } from "node:os";
import { join } from "node:path";
import { access } from "node:fs/promises";
import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const zedDetector: AgentDetector = {
  id: "zed",
  async detect(): Promise<AgentInfo> {
    const binaryPath = await which("zed");
    let installed = binaryPath !== null;
    const version = installed ? await getVersion("zed") ?? undefined : undefined;

    if (!installed) {
      // Check known locations
      const knownPaths = [
        "/Applications/Zed.app",
        join(homedir(), ".local", "bin", "zed"),
        "/usr/bin/zed",
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
      id: "zed",
      name: "Zed",
      installed,
      version,
      binaryPath: binaryPath ?? undefined,
      configPaths: [
        join(homedir(), ".config", "zed", "settings.json"),
        ".rules",
      ],
      configFormat: "json",
      capabilities: ["mcp", "rules"],
    };
  },
};
