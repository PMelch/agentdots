import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { getAllMappers, getMapper, syncSkillsDirectory } from "./mappers.js";
import type { SkillDefinition, SkillsDiffResult } from "./types.js";

const MANIFEST_FILE = ".agentdots-managed-skills.json";

async function listDirectories(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
      continue;
    }
    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

async function hashDirectory(dir: string): Promise<string> {
  const hash = createHash("sha256");
  const files = await collectFiles(dir);

  for (const file of files) {
    const rel = relative(dir, file);
    hash.update(rel);
    hash.update("\0");
    hash.update(await readFile(file));
    hash.update("\0");
  }

  return hash.digest("hex");
}

async function readManifest(dir: string): Promise<string[]> {
  try {
    const raw = await readFile(join(dir, MANIFEST_FILE), "utf-8");
    const parsed = JSON.parse(raw) as { skills?: unknown };
    return Array.isArray(parsed.skills)
      ? parsed.skills.filter((value): value is string => typeof value === "string").sort()
      : [];
  } catch {
    return [];
  }
}

async function writeManifest(dir: string, skills: string[]): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, MANIFEST_FILE), JSON.stringify({ skills }, null, 2));
}

export class SkillsManager {
  constructor(private skillsDir: string) {}

  /**
   * Load skills from agentdots dir AND all agent-specific skill directories.
   * Deduplicates by name — agentdots dir takes priority, then first-found wins.
   */
  async loadSkills(scope: "global" | "project"): Promise<SkillDefinition[]> {
    const seen = new Map<string, SkillDefinition>();

    // 1. Load from agentdots central dir (highest priority)
    const centralNames = await listDirectories(this.skillsDir);
    for (const name of centralNames) {
      const skillPath = join(this.skillsDir, name);
      seen.set(name, { name, path: skillPath, scope, source: skillPath });
    }

    // 2. Load from each agent's skill directory
    for (const mapper of getAllMappers()) {
      const agentSkillsDir = mapper.skillsPath(scope);
      if (!agentSkillsDir) continue;

      const agentNames = await listDirectories(agentSkillsDir);
      for (const name of agentNames) {
        if (seen.has(name)) continue; // skip duplicates
        if (name.startsWith(".")) continue; // skip hidden dirs like .agentdots-managed-skills
        const skillPath = join(agentSkillsDir, name);
        seen.set(name, { name, path: skillPath, scope, source: skillPath });
      }
    }

    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Load skills only from the central agentdots dir (for sync operations) */
  async loadCentralSkills(scope: "global" | "project"): Promise<SkillDefinition[]> {
    const names = await listDirectories(this.skillsDir);
    return names.map((name) => {
      const skillPath = join(this.skillsDir, name);
      return { name, path: skillPath, scope, source: skillPath };
    });
  }

  async syncToAgent(agentId: string, scope: "global" | "project"): Promise<string> {
    const mapper = getMapper(agentId);
    if (!mapper) {
      throw new Error(`No skills mapper for agent '${agentId}'`);
    }

    const targetRoot = mapper.skillsPath(scope);
    if (!targetRoot) {
      throw new Error(`Agent '${agentId}' does not support ${scope} skills`);
    }

    // Sync only from central dir, not from other agents
    const skills = await this.loadCentralSkills(scope);
    const desiredNames = skills.map((skill) => skill.name).sort();
    const previousNames = await readManifest(targetRoot);

    await mkdir(targetRoot, { recursive: true });

    for (const skill of skills) {
      await rm(join(targetRoot, skill.name), { recursive: true, force: true });
      await syncSkillsDirectory(skill.path, join(targetRoot, skill.name));
    }

    for (const staleSkill of previousNames) {
      if (!desiredNames.includes(staleSkill)) {
        await rm(join(targetRoot, staleSkill), { recursive: true, force: true });
      }
    }

    await writeManifest(targetRoot, desiredNames);
    return targetRoot;
  }

  async syncToAll(scope: "global" | "project"): Promise<string[]> {
    const synced: string[] = [];

    for (const mapper of getAllMappers()) {
      try {
        await this.syncToAgent(mapper.agentId, scope);
        synced.push(mapper.agentId);
      } catch {
        // Skip agents that fail.
      }
    }

    return synced;
  }

  async diff(agentId: string, scope: "global" | "project"): Promise<SkillsDiffResult> {
    const mapper = getMapper(agentId);
    if (!mapper) {
      throw new Error(`No skills mapper for agent '${agentId}'`);
    }

    const targetRoot = mapper.skillsPath(scope);
    if (!targetRoot) {
      throw new Error(`Agent '${agentId}' does not support ${scope} skills`);
    }

    const desiredSkills = await this.loadCentralSkills(scope);
    const installedSkills = await this.listInstalled(agentId, scope);
    const desiredMap = new Map(desiredSkills.map((skill) => [skill.name, skill.path]));

    const added = desiredSkills
      .map((skill) => skill.name)
      .filter((name) => !installedSkills.includes(name))
      .sort();
    const removed = installedSkills
      .filter((name) => !desiredMap.has(name))
      .sort();

    const modified: string[] = [];
    for (const skill of desiredSkills) {
      if (!installedSkills.includes(skill.name)) continue;

      const sourceHash = await hashDirectory(skill.path);
      const installedHash = await hashDirectory(join(targetRoot, skill.name));
      if (sourceHash !== installedHash) {
        modified.push(skill.name);
      }
    }

    return {
      hasChanges: added.length > 0 || removed.length > 0 || modified.length > 0,
      added,
      removed,
      modified: modified.sort(),
    };
  }

  async listInstalled(agentId: string, scope: "global" | "project"): Promise<string[]> {
    const mapper = getMapper(agentId);
    if (!mapper) {
      throw new Error(`No skills mapper for agent '${agentId}'`);
    }

    const targetRoot = mapper.skillsPath(scope);
    if (!targetRoot) {
      throw new Error(`Agent '${agentId}' does not support ${scope} skills`);
    }

    const names = await listDirectories(targetRoot);
    return names.filter((name) => name !== basename(MANIFEST_FILE));
  }
}
