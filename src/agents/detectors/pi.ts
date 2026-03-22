import type { AgentDetector, AgentInfo } from "../../core/types.js";
import { which, getVersion } from "../shell.js";

export const piDetector: AgentDetector = {
  id: "pi",
  async detect(): Promise<AgentInfo> {
    const binaryPath = await which("pi");
    const installed = binaryPath !== null;
    const version = installed ? await getVersion("pi") ?? undefined : undefined;

    return {
      id: "pi",
      name: "Pi",
      installed,
      version,
      binaryPath: binaryPath ?? undefined,
      configPaths: [],
      configFormat: "custom",
      capabilities: ["rules"],
    };
  },
};
