import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RuleDefinition, RulesDiffResult } from "./types.js";
import { getMapper, getAllMappers } from "./mappers.js";

export class RulesManager {
  constructor(private rulesDir: string) {}

  /** Load all .md rule files from the rules directory */
  async loadRules(scope: "global" | "project"): Promise<RuleDefinition[]> {
    let files: string[];
    try {
      const entries = await readdir(this.rulesDir);
      files = entries.filter((f) => f.endsWith(".md"));
    } catch {
      return [];
    }

    const rules: RuleDefinition[] = [];
    for (const file of files) {
      const filePath = join(this.rulesDir, file);
      const content = await readFile(filePath, "utf-8");
      rules.push({
        name: file.replace(/\.md$/, ""),
        content,
        scope,
        source: filePath,
      });
    }
    return rules;
  }

  /** Concatenate rules into a single string with section headers */
  mergeRules(rules: RuleDefinition[]): string {
    if (rules.length === 0) return "";
    return rules.map((r) => `## ${r.name}\n\n${r.content.trim()}`).join("\n\n");
  }

  /** Sync merged rules to a specific agent */
  async syncToAgent(agentId: string, scope: "global" | "project"): Promise<string> {
    const mapper = getMapper(agentId);
    if (!mapper) {
      throw new Error(`No rules mapper for agent '${agentId}'`);
    }
    const path = mapper.rulesPath(scope);
    if (!path) {
      throw new Error(`Agent '${agentId}' does not support ${scope} rules`);
    }
    const rules = await this.loadRules(scope);
    const merged = this.mergeRules(rules);
    return mapper.writeRules(merged, scope);
  }

  /** Sync merged rules to all agents that have a mapper */
  async syncToAll(scope: "global" | "project"): Promise<string[]> {
    const rules = await this.loadRules(scope);
    const merged = this.mergeRules(rules);
    const synced: string[] = [];

    for (const mapper of getAllMappers()) {
      const path = mapper.rulesPath(scope);
      if (!path) continue;
      try {
        await mapper.writeRules(merged, scope);
        synced.push(mapper.agentId);
      } catch {
        // Skip agents that fail
      }
    }
    return synced;
  }

  /** Diff current agent rules against desired merged rules */
  async diff(agentId: string, scope: "global" | "project"): Promise<RulesDiffResult> {
    const mapper = getMapper(agentId);
    if (!mapper) {
      throw new Error(`No rules mapper for agent '${agentId}'`);
    }
    const rules = await this.loadRules(scope);
    const desired = this.mergeRules(rules);
    const current = await mapper.readRules(scope);
    return {
      hasChanges: current !== desired,
      current,
      desired,
    };
  }
}
