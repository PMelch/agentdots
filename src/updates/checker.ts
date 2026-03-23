import type { AgentInfo } from "../core/types.js";
import type { UpdateProvider, UpdateInfo, PackageSource, PackageManager } from "./types.js";
import { isNewer } from "./version.js";

/**
 * Detect which package manager originally installed a binary based on its resolved path.
 */
export function detectPackageManager(binaryPath: string | undefined): PackageManager {
  if (!binaryPath) return "npm";
  if (binaryPath.includes(".bun")) return "bun";
  if (binaryPath.includes("/opt/homebrew/") || binaryPath.includes("/usr/local/Cellar/") || binaryPath.includes("/usr/local/opt/")) return "brew";
  if (binaryPath.includes("/snap/")) return "snap";
  return "npm";
}

export function resolveUpdateCommand(source: PackageSource, binaryPath: string | undefined): string | undefined {
  if (source.type === "npm") {
    const pm = detectPackageManager(binaryPath);
    const pkg = source.aliases?.[pm] ?? source.packageName;

    switch (pm) {
      case "bun":   return `bun install -g ${pkg}@latest`;
      case "brew":  return `brew upgrade ${pkg}`;
      case "snap":  return `sudo snap refresh ${pkg}`;
      default:      return `npm install -g ${pkg}@latest`;
    }
  }
  if (source.type === "pip") {
    return `pip install --upgrade ${source.packageName}`;
  }
  return source.updateCommand;
}

export async function checkUpdates(
  agents: AgentInfo[],
  providers: UpdateProvider[]
): Promise<UpdateInfo[]> {
  const providerMap = new Map(providers.map((p) => [p.agentId, p]));
  const results: UpdateInfo[] = [];

  await Promise.all(
    agents.map(async (agent) => {
      const provider = providerMap.get(agent.id);
      if (!provider) return;

      const latestVersion = await provider.fetchLatest();

      results.push({
        agentId: agent.id,
        agentName: agent.name,
        currentVersion: agent.version,
        latestVersion,
        hasUpdate: isNewer(agent.version, latestVersion),
        updateCommand: resolveUpdateCommand(provider.source, agent.binaryPath),
      });
    })
  );

  // Stable order: match original agents order
  results.sort((a, b) => {
    const ai = agents.findIndex((ag) => ag.id === a.agentId);
    const bi = agents.findIndex((ag) => ag.id === b.agentId);
    return ai - bi;
  });

  return results;
}
