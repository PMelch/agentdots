# agentdots

Unified AI agent configuration manager with web UI.

Manage dotfiles, rules, skills, commands, and MCP configs for all your AI coding agents from one place.

## What it does

- **Auto-detect agents** — Scans your system for installed AI coding agents (Claude Code, Codex, Gemini CLI, Cursor, Copilot, OpenCode, Pi, Windsurf, Aider, etc.)
- **Update management** — Check for agent updates, trigger upgrades
- **MCP config** — Manage MCP server configurations (global + per-project)
- **Skills/Rules** — Central skill & rule definitions, synced to agent-specific formats
- **Commands** — Manage slash commands / custom prompts across agents
- **Web UI** — Browser-based dashboard to configure everything visually

## Philosophy

Instead of maintaining separate `.claude/`, `.cursor/`, `.github/copilot-instructions.md`, `GEMINI.md`, etc. — define your config once and let agentdots sync it to the right places.

```
~/.agentdots/           ← Global config (user-level)
  config.yaml           ← Agent registry, preferences
  rules/                ← Shared rules (synced to all agents)
  skills/               ← Shared skills
  commands/             ← Shared slash commands
  mcp/                  ← Global MCP server configs

.agentdots/             ← Project-level config (per repo)
  rules/                ← Project-specific rules
  skills/               ← Project-specific skills
  commands/             ← Project-specific commands
  mcp/                  ← Project-specific MCP servers
  overrides/            ← Per-agent overrides
```

## Tech Stack

- **Runtime:** Node.js (TypeScript)
- **CLI:** Commander.js
- **Web UI:** Built-in HTTP server + vanilla frontend (no framework dependency)
- **Package:** npm (global install)

## Status

🚧 Early development — not usable yet.

## License

MIT
