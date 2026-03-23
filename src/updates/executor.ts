import type { UpdateInfo } from "./types.js";

export interface ExecuteOptions {
  yes: boolean;
  runCommand: (cmd: string) => Promise<boolean>;
  confirm: (question: string) => Promise<boolean>;
}

export interface ExecuteResult {
  agentId: string;
  skipped: boolean;
  skipReason?: string;
  success?: boolean;
}

export async function executeUpdates(
  results: UpdateInfo[],
  opts: ExecuteOptions
): Promise<ExecuteResult[]> {
  const report: ExecuteResult[] = [];

  for (const r of results) {
    if (!r.hasUpdate) {
      report.push({ agentId: r.agentId, skipped: true, skipReason: "no update available" });
      continue;
    }

    if (!r.updateCommand) {
      report.push({ agentId: r.agentId, skipped: true, skipReason: "no update command available" });
      continue;
    }

    if (!opts.yes) {
      const confirmed = await opts.confirm(
        `Update ${r.agentName} ${r.currentVersion ?? "?"} → ${r.latestVersion ?? "?"}\n  $ ${r.updateCommand}\nProceed?`
      );
      if (!confirmed) {
        report.push({ agentId: r.agentId, skipped: true, skipReason: "declined by user" });
        continue;
      }
    }

    const success = await opts.runCommand(r.updateCommand);
    report.push({ agentId: r.agentId, skipped: false, success });
  }

  return report;
}
