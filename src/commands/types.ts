export interface CommandDefinition {
  name: string;       // e.g. "review", "explain"
  content: string;    // Prompt template content
  scope: "global" | "project";
  source: string;
}

export interface CommandsMapper {
  agentId: string;
  commandsPath(scope: "global" | "project"): string;
}

export interface CommandsDiffResult {
  hasChanges: boolean;
  added: string[];
  removed: string[];
  modified: string[];
}
