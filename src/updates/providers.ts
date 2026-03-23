import type { UpdateProvider } from "./types.js";
import { fetchNpmVersion, fetchPypiVersion, fetchGithubVersion } from "./fetchers.js";

const PROVIDERS: UpdateProvider[] = [
  {
    agentId: "claude-code",
    source: { type: "npm", packageName: "@anthropic-ai/claude-code", aliases: { brew: "claude-code" } },
    fetchLatest: () => fetchNpmVersion("@anthropic-ai/claude-code"),
  },
  {
    agentId: "codex",
    source: { type: "npm", packageName: "@openai/codex" },
    fetchLatest: () => fetchNpmVersion("@openai/codex"),
  },
  {
    agentId: "gemini",
    source: { type: "npm", packageName: "@google/gemini-cli", aliases: { brew: "gemini-cli" } },
    fetchLatest: () => fetchNpmVersion("@google/gemini-cli"),
  },
  {
    agentId: "aider",
    source: { type: "pip", packageName: "aider-chat" },
    fetchLatest: () => fetchPypiVersion("aider-chat"),
  },
  {
    agentId: "opencode",
    source: { type: "npm", packageName: "opencode-ai" },
    fetchLatest: () => fetchNpmVersion("opencode-ai"),
  },
  {
    agentId: "cursor",
    source: { type: "custom" },
    fetchLatest: () => fetchGithubVersion("getcursor/cursor"),
  },
  {
    agentId: "windsurf",
    source: { type: "custom" },
    fetchLatest: () => fetchGithubVersion("Exafunction/windsurf"),
  },
  {
    agentId: "copilot",
    source: { type: "custom" },
    fetchLatest: async () => undefined,
  },
  {
    agentId: "cline",
    source: { type: "npm", packageName: "@anthropic-ai/cline" },
    fetchLatest: () => fetchNpmVersion("@anthropic-ai/cline"),
  },
  {
    agentId: "roo-code",
    source: { type: "custom" },
    fetchLatest: () => fetchGithubVersion("RooCodeInc/Roo-Code"),
  },
  {
    agentId: "zed",
    source: { type: "custom" },
    fetchLatest: () => fetchGithubVersion("zed-industries/zed"),
  },
  {
    agentId: "pi",
    source: { type: "npm", packageName: "@mariozechner/pi-coding-agent" },
    fetchLatest: () => fetchNpmVersion("@mariozechner/pi-coding-agent"),
  },
];

export function getProvider(agentId: string): UpdateProvider | undefined {
  return PROVIDERS.find((p) => p.agentId === agentId);
}

export function getAllProviders(): UpdateProvider[] {
  return PROVIDERS;
}
