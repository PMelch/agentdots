import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { UsageInfo, UsageReader } from "../types.js";

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

    try {
      const entries = await readdir(sessionsDir, { withFileTypes: true });
      const sessionDirs = entries.filter(e => e.isDirectory());

      if (sessionDirs.length === 0) return base;

      let totalInput = 0;
      let totalOutput = 0;
      let totalCost = 0;
      let lastTimestamp = "";
      let sessionCount = 0;

      for (const sessionDir of sessionDirs) {
        const sessionPath = join(sessionsDir, sessionDir.name);
        try {
          // Codex stores session data as JSON files
          const files = await readdir(sessionPath);
          for (const file of files) {
            if (!file.endsWith(".json") && !file.endsWith(".jsonl")) continue;
            try {
              const content = await readFile(join(sessionPath, file), "utf-8");

              // Try as JSON first
              if (file.endsWith(".json")) {
                const data = JSON.parse(content);
                if (data.usage) {
                  totalInput += data.usage.input_tokens ?? data.usage.prompt_tokens ?? 0;
                  totalOutput += data.usage.output_tokens ?? data.usage.completion_tokens ?? 0;
                }
                if (data.cost) totalCost += data.cost;
                if (data.timestamp && data.timestamp > lastTimestamp) lastTimestamp = data.timestamp;
                if (data.created_at && data.created_at > lastTimestamp) lastTimestamp = data.created_at;
              }

              // Try as JSONL
              if (file.endsWith(".jsonl")) {
                for (const line of content.split("\n").filter(Boolean)) {
                  try {
                    const msg = JSON.parse(line);
                    if (msg.usage) {
                      totalInput += msg.usage.input_tokens ?? msg.usage.prompt_tokens ?? 0;
                      totalOutput += msg.usage.output_tokens ?? msg.usage.completion_tokens ?? 0;
                    }
                    if (msg.cost) totalCost += msg.cost;
                  } catch { /* skip */ }
                }
              }
            } catch { /* skip unreadable */ }
          }
          sessionCount++;
        } catch { /* skip */ }
      }

      if (sessionCount === 0) return base;

      return {
        ...base,
        available: true,
        source: "local-logs",
        tokens: (totalInput + totalOutput) > 0 ? {
          input: totalInput,
          output: totalOutput,
          total: totalInput + totalOutput,
        } : undefined,
        cost: totalCost > 0 ? { estimated: Math.round(totalCost * 100) / 100, currency: "USD" } : undefined,
        sessions: sessionCount,
        lastActive: lastTimestamp || undefined,
      };
    } catch {
      return base;
    }
  },
};
