# AGENTS.md

## Project: agentdots
Unified AI agent configuration manager with web UI.

## Tech Stack
- Node.js + TypeScript
- Commander.js for CLI
- Built-in HTTP server for Web UI (no heavy framework)
- npm package (global install: `npm i -g agentdots`)

## Conventions
- All source code in `src/`
- Tests with `node:test` + `assert`
- TDD mandatory for all features
- ESM modules (`"type": "module"` in package.json)
- No unnecessary dependencies — keep it lean
- Config format: YAML (user-facing), JSON internally

## Architecture
- `src/cli/` — CLI entry point and commands
- `src/agents/` — Agent detection plugins (one file per agent)
- `src/mcp/` — MCP config management
- `src/rules/` — Rules sync engine
- `src/skills/` — Skills sync engine  
- `src/commands/` — Commands sync engine
- `src/web/` — Web UI server + static assets
- `src/core/` — Shared utilities, config loader, types
