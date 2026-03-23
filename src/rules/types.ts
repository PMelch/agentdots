export interface RuleDefinition {
  name: string;
  content: string;
  scope: "global" | "project";
  source: string;
}

export interface RulesMapper {
  agentId: string;
  /** Read agentdots-managed rules from this agent's config (content between markers) */
  readRules(scope: "global" | "project"): Promise<string | null>;
  /** Write unified rules into agent-specific format; returns path written (empty if unsupported) */
  writeRules(content: string, scope: "global" | "project"): Promise<string>;
  /** Resolve the rules file path for this agent (empty string if scope not supported) */
  rulesPath(scope: "global" | "project"): string;
}

export interface RulesDiffResult {
  hasChanges: boolean;
  current: string | null;
  desired: string;
}
