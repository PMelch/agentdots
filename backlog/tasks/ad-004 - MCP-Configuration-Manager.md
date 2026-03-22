---
id: AD-004
title: MCP Configuration Manager
status: Done
assignee: []
created_date: '2026-03-22 15:21'
updated_date: '2026-03-22 20:39'
labels: []
dependencies:
  - AD-002
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Read, write, and sync MCP server configurations. Support global (~/.agentdots/mcp/) and project-level (.agentdots/mcp/) configs. Map to agent-specific MCP formats (claude_desktop_config.json, .cursor/mcp.json, etc.).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Unified McpServerConfig type supports stdio and http server types
- [x] #2 Mappers convert to/from agent-specific formats for all MCP-capable agents
- [x] #3 Manager loads configs from ~/.agentdots/mcp/ and .agentdots/mcp/
- [x] #4 Manager syncs unified configs to agent-specific config files
- [x] #5 Manager diffs show what would change before syncing
- [x] #6 CLI mcp subcommand with list, sync, diff commands
- [x] #7 All code covered by tests (TDD)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add MCP types (McpServerConfig, McpConfigFile) to src/mcp/types.ts. 2. Implement per-agent format mappers in src/mcp/mapper.ts (toUnified/fromUnified for claude-code, cursor, copilot, gemini, opencode, windsurf, codex). 3. Implement MCP manager in src/mcp/manager.ts (loadAll, syncTo, diff). 4. Add comprehensive tests (mapper round-trips, manager load/sync). 5. Wire into CLI with mcp subcommand (list, sync, diff).
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Summary
- Added unified MCP types (McpServerConfig, McpMapper) supporting stdio and http transports
- Implemented format mappers for 7 agents: claude-code, cursor, copilot, gemini, opencode, windsurf, codex
- Built McpManager with loadConfigs, saveConfig, buildAgentConfig, and diff operations
- Wired CLI with `agentdots mcp list|diff|sync` commands supporting global/project scope
- 26 new tests (mapper round-trips, manager operations, registry lookups) — all 42 tests pass
- Claude Code mapper handles both mcpServers wrapper and top-level plugin format
<!-- SECTION:FINAL_SUMMARY:END -->
