import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import type { RulesMapper } from "./types.js";

// --- Marker constants ---

const MD_BEGIN = "<!-- agentdots:begin -->";
const MD_END = "<!-- agentdots:end -->";
const YAML_BEGIN = "# agentdots:begin";
const YAML_END = "# agentdots:end";

// --- Shared helpers ---

function extractSection(content: string, begin: string, end: string): string | null {
  const beginIdx = content.indexOf(begin);
  const endIdx = content.indexOf(end);
  if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) return null;
  return content.slice(beginIdx + begin.length, endIdx).trim();
}

function injectSection(existing: string, section: string, begin: string, end: string): string {
  const beginIdx = existing.indexOf(begin);
  const endIdx = existing.indexOf(end);

  if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
    return existing.slice(0, beginIdx) + section + existing.slice(endIdx + end.length);
  }

  // Append to end
  const sep = existing.length > 0 && !existing.endsWith("\n\n")
    ? existing.endsWith("\n") ? "\n" : "\n\n"
    : "";
  return existing + sep + section + "\n";
}

// --- Markdown helpers ---

async function readMarkdownRules(filePath: string): Promise<string | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    return extractSection(content, MD_BEGIN, MD_END);
  } catch {
    return null;
  }
}

async function writeMarkdownRules(content: string, filePath: string): Promise<string> {
  let existing = "";
  try {
    existing = await readFile(filePath, "utf-8");
  } catch {
    // new file
  }
  const section = `${MD_BEGIN}\n${content}\n${MD_END}`;
  const updated = injectSection(existing, section, MD_BEGIN, MD_END);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, updated);
  return filePath;
}

function makeMarkdownMapper(
  agentId: string,
  globalPath: string,
  projectPath: string,
): RulesMapper {
  return {
    agentId,
    rulesPath(scope) {
      return scope === "global" ? globalPath : projectPath;
    },
    async readRules(scope) {
      const p = scope === "global" ? globalPath : projectPath;
      if (!p) return null;
      return readMarkdownRules(p);
    },
    async writeRules(content, scope) {
      const p = scope === "global" ? globalPath : projectPath;
      if (!p) return "";
      return writeMarkdownRules(content, p);
    },
  };
}

// --- Aider YAML helpers ---

function buildAiderSection(content: string): string {
  const indented = content
    .split("\n")
    .map((l) => (l.length > 0 ? `    ${l}` : ""))
    .join("\n");
  return `${YAML_BEGIN}\nconventions:\n  - |\n${indented}\n${YAML_END}`;
}

function parseAiderSection(section: string): string {
  const lines = section.split("\n");
  const blockStart = lines.findIndex((l) => l.trim() === "- |");
  if (blockStart === -1) return section;
  const blockLines = lines.slice(blockStart + 1);
  return blockLines
    .map((l) => (l.startsWith("    ") ? l.slice(4) : l))
    .join("\n")
    .trim();
}

async function readAiderRules(filePath: string): Promise<string | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const section = extractSection(content, YAML_BEGIN, YAML_END);
    if (!section) return null;
    return parseAiderSection(section);
  } catch {
    return null;
  }
}

async function writeAiderRules(content: string, filePath: string): Promise<string> {
  let existing = "";
  try {
    existing = await readFile(filePath, "utf-8");
  } catch {
    // new file
  }
  const section = buildAiderSection(content);
  const updated = injectSection(existing, section, YAML_BEGIN, YAML_END);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, updated);
  return filePath;
}

// --- Agent mappers ---

export const claudeCodeMapper: RulesMapper = makeMarkdownMapper(
  "claude-code",
  join(homedir(), ".claude", "CLAUDE.md"),
  "CLAUDE.md",
);

export const cursorMapper: RulesMapper = makeMarkdownMapper(
  "cursor",
  join(homedir(), ".cursor", "rules", "agentdots.mdc"),
  ".cursorrules",
);

export const copilotMapper: RulesMapper = makeMarkdownMapper(
  "copilot",
  "", // no global rules file for copilot
  join(".github", "copilot-instructions.md"),
);

export const geminiMapper: RulesMapper = makeMarkdownMapper(
  "gemini",
  "", // no global rules file for gemini
  "GEMINI.md",
);

export const codexMapper: RulesMapper = makeMarkdownMapper(
  "codex",
  "", // no global rules file for codex
  "AGENTS.md",
);

export const opencodeMapper: RulesMapper = makeMarkdownMapper(
  "opencode",
  join(homedir(), ".opencode", "rules", "agentdots.md"),
  join(".opencode", "rules", "agentdots.md"),
);

export const aiderMapper: RulesMapper = {
  agentId: "aider",
  rulesPath(scope) {
    return scope === "global"
      ? join(homedir(), ".aider.conf.yml")
      : ".aider.conf.yml";
  },
  async readRules(scope) {
    return readAiderRules(this.rulesPath(scope));
  },
  async writeRules(content, scope) {
    return writeAiderRules(content, this.rulesPath(scope));
  },
};

export const windsurfMapper: RulesMapper = makeMarkdownMapper(
  "windsurf",
  join(homedir(), ".codeium", "windsurf", "memories", "global_rules.md"),
  ".windsurfrules",
);

export const clineMapper: RulesMapper = makeMarkdownMapper(
  "cline",
  "", // no global rules file (VS Code extension)
  ".clinerules",
);

export const rooCodeMapper: RulesMapper = makeMarkdownMapper(
  "roo-code",
  join(homedir(), ".roo", "rules", "agentdots.md"),
  join(".roo", "rules", "agentdots.md"),
);

export const zedMapper: RulesMapper = makeMarkdownMapper(
  "zed",
  join(homedir(), ".config", "zed", "agentdots-rules.md"),
  join(".rules", "agentdots.md"),
);

// --- Registry ---

const mappers = new Map<string, RulesMapper>([
  ["claude-code", claudeCodeMapper],
  ["cursor", cursorMapper],
  ["copilot", copilotMapper],
  ["gemini", geminiMapper],
  ["codex", codexMapper],
  ["opencode", opencodeMapper],
  ["aider", aiderMapper],
  ["windsurf", windsurfMapper],
  ["cline", clineMapper],
  ["roo-code", rooCodeMapper],
  ["zed", zedMapper],
]);

export function getMapper(agentId: string): RulesMapper | undefined {
  return mappers.get(agentId);
}

export function getAllMappers(): RulesMapper[] {
  return [...mappers.values()];
}
