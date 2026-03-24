import { exec } from "node:child_process";
import { getProvider } from "../updates/providers.js";

export interface InstallResult {
  agentId: string;
  success: boolean;
  method: "npm" | "pip" | "manual";
  command?: string;
  downloadUrl?: string;
  error?: string;
}

const DOWNLOAD_URLS: Record<string, string> = {
  cursor: "https://www.cursor.com/downloads",
  windsurf: "https://windsurf.com/download",
  zed: "https://zed.dev/download",
  "roo-code": "https://marketplace.visualstudio.com/items?itemName=RooVetInc.roo-cline",
  copilot: "https://marketplace.visualstudio.com/items?itemName=GitHub.copilot",
};

export function resolveInstallInfo(agentId: string): InstallResult {
  const provider = getProvider(agentId);

  if (DOWNLOAD_URLS[agentId]) {
    return {
      agentId,
      success: false,
      method: "manual",
      downloadUrl: DOWNLOAD_URLS[agentId],
    };
  }

  if (!provider) {
    return { agentId, success: false, method: "manual", error: "Unknown agent" };
  }

  const source = provider.source;
  if (source.type === "npm") {
    return {
      agentId,
      success: false,
      method: "npm",
      command: `npm install -g ${source.packageName}`,
    };
  }
  if (source.type === "pip") {
    return {
      agentId,
      success: false,
      method: "pip",
      command: `pip install ${source.packageName}`,
    };
  }

  return { agentId, success: false, method: "manual", error: "No install method available" };
}

export async function executeInstall(agentId: string): Promise<InstallResult> {
  const info = resolveInstallInfo(agentId);

  if (info.method === "manual") {
    return info;
  }

  if (!info.command) {
    return { ...info, error: "No install command resolved" };
  }

  return new Promise((resolve) => {
    exec(info.command!, { timeout: 120_000 }, (error, _stdout, stderr) => {
      if (error) {
        resolve({
          ...info,
          success: false,
          error: stderr?.trim() || error.message,
        });
      } else {
        resolve({ ...info, success: true });
      }
    });
  });
}
