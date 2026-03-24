import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { UsageInfo, UsageReader } from "../types.js";

interface CodexTokenCount {
  type: "event_msg";
  timestamp: string;
  payload: {
    type: "token_count";
    info: {
      total_token_usage: {
        input_tokens?: number;
        cached_input_tokens?: number;
        output_tokens?: number;
        reasoning_output_tokens?: number;
        total_tokens?: number;
      };
    };
    rate_limits?: {
      primary?: { used_percent: number; window_minutes: number; resets_at: number };
      secondary?: { used_percent: number; window_minutes: number; resets_at: number };
      plan_type?: string;
    };
  };
}

async function findJsonlFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...await findJsonlFiles(fullPath));
      } else if (entry.name.endsWith(".jsonl")) {
        results.push(fullPath);
      }
    }
  } catch {
    // not readable
  }
  return results;
}

export const codexReader: UsageReader = {
  agentId: "codex",

  async read(): Promise<UsageInfo> {
    const base: UsageInfo = {
      agentId: "codex",
      agentName: "OpenAI Codex CLI",
      available: false,
      source: "unavailable",
    };

    const sessionsDir = join(homedir(), ".codex", "sessions");
    const jsonlFiles = await findJsonlFiles(sessionsDir);

    if (jsonlFiles.length === 0) return base;

    let totalInput = 0;
    let totalOutput = 0;
    let sessionCount = 0;
    let lastTimestamp = "";
    let latestRateLimits: CodexTokenCount["payload"]["rate_limits"] | undefined;

    for (const file of jsonlFiles) {
      sessionCount++;
      let sessionMaxInput = 0;
      let sessionMaxOutput = 0;

      try {
        const content = await readFile(file, "utf-8");
        for (const line of content.split("\n").filter(Boolean)) {
          try {
            const msg = JSON.parse(line);

            // Parse token_count events
            if (msg.type === "event_msg" && msg.payload?.type === "token_count") {
              const tu = msg.payload.info?.total_token_usage;
              if (tu) {
                // total_token_usage is cumulative per session — take the max
                sessionMaxInput = Math.max(sessionMaxInput, tu.input_tokens ?? 0);
                sessionMaxOutput = Math.max(sessionMaxOutput, (tu.output_tokens ?? 0) + (tu.reasoning_output_tokens ?? 0));
              }
              if (msg.payload.rate_limits) {
                latestRateLimits = msg.payload.rate_limits;
              }
            }

            if (msg.timestamp && msg.timestamp > lastTimestamp) {
              lastTimestamp = msg.timestamp;
            }
          } catch { /* skip malformed */ }
        }
      } catch { /* skip unreadable */ }

      totalInput += sessionMaxInput;
      totalOutput += sessionMaxOutput;
    }

    // Build quota info from rate limits
    let quota: UsageInfo["quota"] | undefined;
    if (latestRateLimits?.secondary) {
      const rl = latestRateLimits.secondary;
      quota = {
        used: Math.round(rl.used_percent * 100) / 100,
        limit: 100,
        resetAt: new Date(rl.resets_at * 1000).toISOString(),
      };
    }

    return {
      ...base,
      available: true,
      source: "local-logs",
      tokens: (totalInput + totalOutput) > 0 ? {
        input: totalInput,
        output: totalOutput,
        total: totalInput + totalOutput,
      } : undefined,
      quota,
      sessions: sessionCount,
      lastActive: lastTimestamp || undefined,
    };
  },
};
