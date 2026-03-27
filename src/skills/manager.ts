import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { getAllMappers, getMapper, syncSkillsDirectory } from "./mappers.js";
import type { SkillDefinition, SkillMetadataEntry, SkillsDiffResult } from "./types.js";

const MANIFEST_FILE = ".agentdots-managed-skills.json";

type FrontmatterValue = string | string[] | Record<string, string>;

function parseScalar(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseIndentedBlock(lines: string[]): FrontmatterValue | undefined {
  const meaningfulLines = lines.filter((line) => line.trim().length > 0);
  if (meaningfulLines.length === 0) return undefined;

  if (meaningfulLines.every((line) => line.trimStart().startsWith("- "))) {
    return meaningfulLines.map((line) => parseScalar(line.trimStart().slice(2)));
  }

  const values: Record<string, string> = {};
  for (const line of meaningfulLines) {
    const match = line.match(/^\s+([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
    if (!match) continue;
    values[match[1]] = parseScalar(match[2] ?? "");
  }

  return Object.keys(values).length > 0 ? values : undefined;
}

function parseFrontmatter(content: string): Record<string, FrontmatterValue> {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return {};

  const frontmatter: Record<string, FrontmatterValue> = {};
  let index = 1;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "---") break;
    if (line.trim().length === 0) {
      index += 1;
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
    if (!match) {
      index += 1;
      continue;
    }

    const key = match[1];
    const inlineValue = match[2];

    if (inlineValue !== undefined) {
      frontmatter[key] = parseScalar(inlineValue);
      index += 1;
      continue;
    }

    index += 1;
    const nestedLines: string[] = [];
    while (index < lines.length && lines[index].trim() !== "---") {
      const nestedLine = lines[index];
      if (!nestedLine.startsWith(" ") && nestedLine.trim().length > 0) break;
      nestedLines.push(nestedLine);
      index += 1;
    }

    const nestedValue = parseIndentedBlock(nestedLines);
    if (nestedValue !== undefined) {
      frontmatter[key] = nestedValue;
    }
  }

  return frontmatter;
}

function pushMetadataEntry(
  entries: SkillMetadataEntry[],
  key: string,
  value: FrontmatterValue | undefined,
  flattenChildren = false,
): void {
  if (value === undefined) return;

  if (Array.isArray(value)) {
    if (value.length > 0) {
      entries.push({ key, value: value.join(", ") });
    }
    return;
  }

  if (typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      pushMetadataEntry(entries, flattenChildren ? childKey : `${key}_${childKey}`, childValue);
    }
    return;
  }

  if (value.length > 0) {
    entries.push({ key, value });
  }
}

async function readSkillDefinition(
  name: string,
  skillPath: string,
  scope: "global" | "project",
): Promise<SkillDefinition> {
  const skill: SkillDefinition = { name, path: skillPath, scope, source: skillPath };

  try {
    const markdown = await readFile(join(skillPath, "SKILL.md"), "utf-8");
    const frontmatter = parseFrontmatter(markdown);
    const description = typeof frontmatter.description === "string" ? frontmatter.description : undefined;
    const metadata: SkillMetadataEntry[] = [];

    for (const [key, value] of Object.entries(frontmatter)) {
      if (key === "name" || key === "description") continue;
      pushMetadataEntry(metadata, key, value, key === "metadata");
    }

    if (description) {
      skill.description = description;
    }
    if (metadata.length > 0) {
      skill.metadata = metadata;
    }
  } catch {
    // Skills without a readable SKILL.md still appear in the list.
  }

  return skill;
}

async function listDirectories(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const dirs: string[] = [];
    for (const entry of entries) {
      // Follow symlinks: isDirectory() returns false for symlinks,
      // so we stat the full path to check the target
      if (entry.isDirectory() || entry.isSymbolicLink()) {
        try {
          const s = await stat(join(dir, entry.name));
          if (s.isDirectory()) dirs.push(entry.name);
        } catch {
          // broken symlink, skip
        }
      }
    }
    return dirs.sort();
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
    if (entry.isSymbolicLink()) {
      try {
        const resolved = await stat(entryPath);
        if (resolved.isDirectory()) {
          files.push(...await collectFiles(entryPath));
          continue;
        }
        if (resolved.isFile()) {
          files.push(entryPath);
        }
      } catch {
        // broken symlink, skip
      }
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
      seen.set(name, await readSkillDefinition(name, skillPath, scope));
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
        seen.set(name, await readSkillDefinition(name, skillPath, scope));
      }
    }

    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Load skills only from the central agentdots dir (for sync operations) */
  async loadCentralSkills(scope: "global" | "project"): Promise<SkillDefinition[]> {
    const names = await listDirectories(this.skillsDir);
    return Promise.all(names.map((name) => readSkillDefinition(name, join(this.skillsDir, name), scope)));
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
