export const AGENT_ICONS = {
  "claude-code": "icons/claude-code.ico",
  "cursor": "icons/cursor.ico",
  "copilot": "icons/copilot.ico",
  "gemini": "icons/gemini.svg",
  "codex": "icons/codex.ico",
  "opencode": "icons/opencode.ico",
  "aider": "icons/aider.png",
  "windsurf": "icons/windsurf.ico",
  "cline": "icons/cline.png",
  "roo-code": "icons/roo-code.ico",
  "zed": "icons/zed.ico",
  "pi": "icons/pi.svg",
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
