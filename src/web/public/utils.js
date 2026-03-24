export const AGENT_ICONS = {
  "claude-code": "https://claude.ai/favicon.ico",
  "cursor": "https://www.cursor.com/favicon.ico",
  "copilot": "https://github.com/favicon.ico",
  "gemini": "https://gemini.google.com/favicon.ico",
  "codex": "https://openai.com/favicon.ico",
  "opencode": "https://opencode.ai/favicon.ico",
  "aider": "https://aider.chat/assets/favicon.ico",
  "windsurf": "https://windsurf.com/favicon.ico",
  "cline": "https://cline.bot/favicon.ico",
  "roo-code": "https://roocode.com/favicon.ico",
  "zed": "https://zed.dev/favicon.ico",
  "pi": "https://pi.dev/favicon.ico",
};

export function getAgentIcon(id) {
  return AGENT_ICONS[id] ?? "🤖";
}

export function formatTokens(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
