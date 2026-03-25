import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const piDetector: AgentDetector = {
  id: "pi",
  async detectInstalled(): Promise<AgentInfo> {
    const binaryPath = await which("pi");

    return {
      id: "pi",
      name: "Pi",
      installed: binaryPath !== null,
      binaryPath: binaryPath ?? undefined,
      configPaths: [],
      configFormat: "custom",
      capabilities: ["rules"],
    };
  },
  async detect(): Promise<AgentInfo> {
    const info = await this.detectInstalled();
    const version = info.installed ? await getVersion("pi") ?? undefined : undefined;
    return { ...info, version };
  },
};
