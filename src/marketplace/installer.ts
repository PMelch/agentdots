import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";

const exec = promisify(execCb);

/** Low-level options for installFromGit */
export interface GitInstallOptions {
  path?: string;
  targetDir: string;
  skillName?: string;
}

/** High-level options for the installSkill wrapper */
export interface InstallOptions {
  url: string;
  scope: "global" | "project";
  path?: string;
  name?: string;
}

export interface InstallResult {
  success: boolean;
  skillName: string;
  installedTo: string;
  error?: string;
}

export interface MarketplaceSource {
  name: string;
  url: string;
  path?: string;
  scope: "global" | "project";
  installedAt: string;
}

export function inferSkillName(url: string, subPath?: string): string {
  if (subPath) return subPath.split("/").filter(Boolean).pop() ?? "skill";
  return url.split("/").pop()?.replace(/\.git$/, "") ?? "skill";
}

export async function copySkillDir(
  sourceDir: string,
  targetDir: string,
  skillName: string
): Promise<string> {
  const destDir = join(targetDir, skillName);
  await mkdir(targetDir, { recursive: true });
  // Copy entries, skipping .git
  const entries = await readdir(sourceDir, { withFileTypes: true });
  await mkdir(destDir, { recursive: true });
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    await cp(join(sourceDir, entry.name), join(destDir, entry.name), { recursive: true });
  }
  return destDir;
}

export async function installFromGit(
  url: string,
  options: GitInstallOptions,
  _gitClone?: (url: string, targetPath: string) => Promise<void>
): Promise<string> {
  const skillName = options.skillName ?? inferSkillName(url, options.path);
  const tempDir = await mkdtemp(join(tmpdir(), "agentdots-install-"));

  try {
    const cloneFn =
      _gitClone ??
      (async (repoUrl, dir) => {
        await exec(`git clone --depth 1 ${JSON.stringify(repoUrl)} ${JSON.stringify(dir)}`);
      });

    await cloneFn(url, tempDir);

    const sourceDir = options.path ? join(tempDir, options.path) : tempDir;
    return await copySkillDir(sourceDir, options.targetDir, skillName);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

/** High-level install: clones + tracks source */
export async function installSkill(options: InstallOptions): Promise<InstallResult> {
  const scope = options.scope;
  const skillsDir =
    scope === "global"
      ? join(homedir(), ".agentdots", "skills")
      : join(".agentdots", "skills");
  const skillName = options.name ?? inferSkillName(options.url, options.path);

  try {
    const installedTo = await installFromGit(options.url, {
      path: options.path,
      targetDir: skillsDir,
      skillName,
    });
    await addSource({
      name: skillName,
      url: options.url,
      path: options.path,
      scope,
      installedAt: new Date().toISOString(),
    });
    return { success: true, skillName, installedTo };
  } catch (err) {
    return {
      success: false,
      skillName,
      installedTo: join(skillsDir, skillName),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function uninstall(skillName: string, scope: "global" | "project"): Promise<void> {
  const skillsDir =
    scope === "global"
      ? join(homedir(), ".agentdots", "skills")
      : join(".agentdots", "skills");

  await rm(join(skillsDir, skillName), { recursive: true, force: true });
  await removeSource(skillName, scope);
}

/** High-level uninstall wrapper returning a result object */
export async function uninstallSkill(
  skillName: string,
  scope: "global" | "project"
): Promise<{ success: boolean; error?: string }> {
  try {
    await uninstall(skillName, scope);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function getSourcesPath(scope: "global" | "project"): string {
  return scope === "global"
    ? join(homedir(), ".agentdots", "marketplace-sources.json")
    : join(".agentdots", "marketplace-sources.json");
}

export async function readSources(scope: "global" | "project"): Promise<MarketplaceSource[]> {
  try {
    const content = await readFile(getSourcesPath(scope), "utf-8");
    return JSON.parse(content) as MarketplaceSource[];
  } catch {
    return [];
  }
}

async function writeSources(
  scope: "global" | "project",
  sources: MarketplaceSource[]
): Promise<void> {
  const dir = scope === "global" ? join(homedir(), ".agentdots") : ".agentdots";
  await mkdir(dir, { recursive: true });
  await writeFile(getSourcesPath(scope), JSON.stringify(sources, null, 2));
}

export async function addSource(source: MarketplaceSource): Promise<void> {
  const sources = await readSources(source.scope);
  const idx = sources.findIndex((s) => s.name === source.name);
  if (idx >= 0) {
    sources[idx] = source;
  } else {
    sources.push(source);
  }
  await writeSources(source.scope, sources);
}

async function removeSource(name: string, scope: "global" | "project"): Promise<void> {
  const sources = await readSources(scope);
  await writeSources(
    scope,
    sources.filter((s) => s.name !== name)
  );
}
