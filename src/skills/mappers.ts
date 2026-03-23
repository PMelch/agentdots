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

export const cursorMapper: SkillsMapper = makeSkillsMapper(
  "cursor",
  join(homedir(), ".cursor", "skills"),
  join(".cursor", "skills"),
);

export const rooCodeMapper: SkillsMapper = makeSkillsMapper(
  "roo-code",
  join(homedir(), ".roo", "skills"),
  join(".roo", "skills"),
);

const mappers = new Map<string, SkillsMapper>([
  ["claude-code", claudeCodeMapper],
  ["cursor", cursorMapper],
  ["roo-code", rooCodeMapper],
]);

export function getMapper(agentId: string): SkillsMapper | undefined {
  return mappers.get(agentId);
}

export function getAllMappers(): SkillsMapper[] {
  return [...mappers.values()];
}
