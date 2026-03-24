import type { UsageInfo, UsageReader } from "./types.js";
import { claudeCodeReader } from "./readers/claude-code.js";
import { codexReader } from "./readers/codex.js";

const READERS: UsageReader[] = [
  claudeCodeReader,
  codexReader,
];

const readerMap = new Map(READERS.map(r => [r.agentId, r]));

export async function getUsage(agentId: string): Promise<UsageInfo> {
  const reader = readerMap.get(agentId);
  if (!reader) {
    return {
      agentId,
      agentName: agentId,
      available: false,
      source: "unavailable",
    };
  }
  try {
    return await reader.read();
  } catch {
    return {
      agentId,
      agentName: agentId,
      available: false,
      source: "unavailable",
    };
  }
}

export async function getAllUsage(): Promise<UsageInfo[]> {
  return Promise.all(READERS.map(r => getUsage(r.agentId)));
}
