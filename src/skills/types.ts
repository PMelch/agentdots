export interface SkillMetadataEntry {
  key: string;
  value: string;
}

export interface SkillDefinition {
  name: string;
  path: string;
  scope: "global" | "project";
  source: string;
  description?: string;
  metadata?: SkillMetadataEntry[];
}

export interface SkillsMapper {
  agentId: string;
  /** Resolve the skills directory path for this agent (empty string if scope not supported) */
  skillsPath(scope: "global" | "project"): string;
}

export interface SkillsDiffResult {
  hasChanges: boolean;
  added: string[];
  removed: string[];
  modified: string[];
}
