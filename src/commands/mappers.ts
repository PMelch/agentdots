import { homedir } from "node:os";
import { join } from "node:path";
import type { CommandsMapper } from "./types.js";

function makeCommandsMapper(
  agentId: string,
  globalPath: string,
  projectPath: string,
): CommandsMapper {
  return {
    agentId,
    commandsPath(scope) {
      return scope === "global" ? globalPath : projectPath;
    },
  };
}

// Only claude-code and cursor have native command directories
export const claudeCodeMapper: CommandsMapper = makeCommandsMapper(
  "claude-code",
  join(homedir(), ".claude", "commands"),
  join(".claude", "commands"),
);

export const cursorMapper: CommandsMapper = makeCommandsMapper(
  "cursor",
  "", // cursor has no global commands directory
  join(".cursor", "commands"),
);

const mappers = new Map<string, CommandsMapper>([
  ["claude-code", claudeCodeMapper],
  ["cursor", cursorMapper],
]);

export function getMapper(agentId: string): CommandsMapper | undefined {
  return mappers.get(agentId);
}

export function getAllMappers(): CommandsMapper[] {
  return [...mappers.values()];
}
