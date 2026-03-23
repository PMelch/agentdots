---
id: AD-012
title: Configurable Paths — Custom Config Directory Mapping
status: To Do
assignee: []
created_date: '2026-03-23 20:12'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
By default agentdots uses ~/.agentdots/ (global) and .agentdots/ (project) for rules, skills, commands, and MCP configs. Users should be able to remap these paths to custom locations (e.g. .agent/, agent-config/, or any arbitrary path). Implementation: 1) Global config file ~/.agentdots/config.yaml with paths section (globalRoot, projectRoot, or per-feature overrides). 2) agentdots config command to view/set config values (agentdots config set paths.projectRoot .agent). 3) agentdots init to scaffold the config directory at the configured location. 4) All managers (rules, skills, mcp, commands) must resolve paths through a central config loader instead of hardcoding .agentdots/. 5) Support env var AGENTDOTS_DIR as override. 6) CLI --config flag for one-off path override.
<!-- SECTION:DESCRIPTION:END -->
