---
id: AD-008
title: CLI Interface
status: To Do
assignee: []
created_date: '2026-03-22 15:21'
updated_date: '2026-03-23 20:20'
labels: []
dependencies:
  - AD-001
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Convenience top-level commands that orchestrate across all modules: 1) agentdots sync [agentId] — runs rules sync + skills sync + mcp sync + commands sync in one go. 2) agentdots diff [agentId] — shows combined diff across all modules. 3) agentdots init — scaffolds .agentdots/ (or configured dir) with rules/, skills/, commands/, mcp/ subdirs + config.yaml template. 4) agentdots status — overview of all agents, sync state, pending updates. Note: individual module CLIs (rules/skills/mcp/update) already exist. Config/paths handling moved to AD-012.
<!-- SECTION:DESCRIPTION:END -->
