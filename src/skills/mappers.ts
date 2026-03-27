import { cp } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { SkillsMapper } from "./types.js";

function makeSkillsMapper(agentId: string, globalPath: string, projectPath: string): SkillsMapper {
  return {
    agentId,
    skillsPath(scope) {
      return scope === "global" ? globalPath : projectPath;
    },
  };
}

export async function syncSkillsDirectory(sourceDir: string, targetDir: string): Promise<void> {
  await cp(sourceDir, targetDir, { recursive: true, force: true });
}

export const claudeCodeMapper: SkillsMapper = makeSkillsMapper(
  "claude-code",
  join(homedir(), ".claude", "skills"),
  join(".claude", "skills"),
);

export const codexMapper: SkillsMapper = makeSkillsMapper(
  "codex",
  join(homedir(), ".agents", "skills"),
  join(".agents", "skills"),
);

export const geminiMapper: SkillsMapper = makeSkillsMapper(
  "gemini",
  join(homedir(), ".gemini", "skills"),
  join(".gemini", "skills"),
);

export const cursorMapper: SkillsMapper = makeSkillsMapper(
  "cursor",
  join(homedir(), ".cursor", "skills"),
  join(".cursor", "skills"),
);

export const copilotMapper: SkillsMapper = makeSkillsMapper(
  "copilot",
  join(homedir(), ".copilot", "skills"),
  join(".github", "skills"),
);

export const opencodeMapper: SkillsMapper = makeSkillsMapper(
  "opencode",
  join(homedir(), ".config", "opencode", "skills"),
  join(".opencode", "skills"),
);

export const piMapper: SkillsMapper = makeSkillsMapper(
  "pi",
  join(homedir(), ".pi", "agent", "skills"),
  join(".pi", "skills"),
);

export const windsurfMapper: SkillsMapper = makeSkillsMapper(
  "windsurf",
  join(homedir(), ".codeium", "windsurf", "skills"),
  join(".windsurf", "skills"),
);

export const clineMapper: SkillsMapper = makeSkillsMapper(
  "cline",
  join(homedir(), ".cline", "skills"),
  join(".cline", "skills"),
);

export const rooCodeMapper: SkillsMapper = makeSkillsMapper(
  "roo-code",
  join(homedir(), ".roo", "skills"),
  join(".roo", "skills"),
);

const mappers = new Map<string, SkillsMapper>([
  ["claude-code", claudeCodeMapper],
  ["codex", codexMapper],
  ["gemini", geminiMapper],
  ["cursor", cursorMapper],
  ["copilot", copilotMapper],
  ["opencode", opencodeMapper],
  ["pi", piMapper],
  ["windsurf", windsurfMapper],
  ["cline", clineMapper],
  ["roo-code", rooCodeMapper],
]);

export function getMapper(agentId: string): SkillsMapper | undefined {
  return mappers.get(agentId);
}

export function getAllMappers(): SkillsMapper[] {
  return [...mappers.values()];
}
