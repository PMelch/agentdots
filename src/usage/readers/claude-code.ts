import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { UsageInfo, UsageReader } from "../types.js";

async function globJsonlFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...await globJsonlFiles(fullPath));
      } else if (entry.name.endsWith(".jsonl")) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }
  return results;
}

interface ClaudeMessage {
  costUSD?: number;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
  };
  timestamp?: string;
  type?: string;
}

export const claudeCodeReader: UsageReader = {
  agentId: "claude-code",

  async read(): Promise<UsageInfo> {
    const base: UsageInfo = {
      agentId: "claude-code",
      agentName: "Claude Code",
      available: false,
      source: "unavailable",
    };

    const projectsDir = join(homedir(), ".claude", "projects");
    const jsonlFiles = await globJsonlFiles(projectsDir);

    if (jsonlFiles.length === 0) {
      // Try stats-cache.json as fallback
      try {
        const cacheRaw = await readFile(join(homedir(), ".claude", "stats-cache.json"), "utf-8");
        const cache = JSON.parse(cacheRaw);
        if (cache && typeof cache === "object") {
          return {
            ...base,
            available: true,
            source: "local-logs",
            sessions: cache.totalSessions ?? undefined,
          };
        }
      } catch {
        // No cache either
      }
      return base;
    }

    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;
    let sessions = 0;
    let lastTimestamp = "";

    for (const file of jsonlFiles) {
      sessions++;
      try {
        const content = await readFile(file, "utf-8");
        const lines = content.split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const msg: ClaudeMessage = JSON.parse(line);
            if (msg.tokenUsage) {
              totalInput += msg.tokenUsage.inputTokens ?? 0;
              totalOutput += msg.tokenUsage.outputTokens ?? 0;
            }
            if (msg.costUSD) {
              totalCost += msg.costUSD;
            }
            if (msg.timestamp && msg.timestamp > lastTimestamp) {
              lastTimestamp = msg.timestamp;
            }
          } catch {
            // Skip malformed lines
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    return {
      ...base,
      available: true,
      source: "local-logs",
      tokens: {
        input: totalInput,
        output: totalOutput,
        total: totalInput + totalOutput,
      },
      cost: totalCost > 0 ? { estimated: Math.round(totalCost * 100) / 100, currency: "USD" } : undefined,
      sessions,
      lastActive: lastTimestamp || undefined,
    };
  },
};
