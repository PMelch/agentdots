export type PackageSource =
  | { type: "npm"; packageName: string; aliases?: Partial<Record<PackageManager, string>> }
  | { type: "pip"; packageName: string }
  | { type: "custom"; updateCommand?: string };

export type PackageManager = "npm" | "bun" | "brew" | "apt" | "snap" | "dnf" | "pacman";

export interface UpdateProvider {
  agentId: string;
  source: PackageSource;
  fetchLatest(): Promise<string | undefined>;
}

export interface UpdateInfo {
  agentId: string;
  agentName: string;
  currentVersion: string | undefined;
  latestVersion: string | undefined;
  hasUpdate: boolean;
  updateCommand: string | undefined;
}
