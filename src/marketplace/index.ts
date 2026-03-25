import type { MarketplaceSkill, SkillRegistry } from "./types.js";
import { GitHubRegistry } from "./registries/github.js";

const REGISTRIES: SkillRegistry[] = [new GitHubRegistry()];

export async function searchSkills(query: string): Promise<MarketplaceSkill[]> {
  const results: MarketplaceSkill[] = [];
  const seen = new Set<string>();

  for (const registry of REGISTRIES) {
    const skills = await registry.search(query);
    for (const skill of skills) {
      if (seen.has(skill.url)) continue;
      seen.add(skill.url);
      results.push(skill);
    }
  }

  return results;
}

export async function listAllSkills(): Promise<MarketplaceSkill[]> {
  const results: MarketplaceSkill[] = [];
  const seen = new Set<string>();

  for (const registry of REGISTRIES) {
    const skills = await registry.list();
    for (const skill of skills) {
      if (seen.has(skill.url)) continue;
      seen.add(skill.url);
      results.push(skill);
    }
  }

  return results;
}

export { installFromGit, uninstallSkill, inferSkillName } from "./installer.js";
export type { MarketplaceSkill } from "./types.js";
export type { GitInstallOptions } from "./installer.js";
