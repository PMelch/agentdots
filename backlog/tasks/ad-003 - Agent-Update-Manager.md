---
id: AD-003
title: Agent Update Manager
status: Done
assignee:
  - claude
created_date: '2026-03-22 15:21'
updated_date: '2026-03-22 20:52'
labels: []
dependencies:
  - AD-002
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Check for available updates for each detected agent. Show current vs latest version. Option to trigger update (npm update, pip upgrade, brew upgrade, etc. depending on agent).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 agentdots updates lists all installed agents with current/latest version and update status
- [x] #2 agentdots updates <id> checks a single agent
- [x] #3 Shows update command for each agent with an available update
- [x] #4 Gracefully handles offline/registry-unreachable cases
- [x] #5 Tests cover version comparison, provider registry, and checker logic
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add types in src/updates/types.ts (UpdateSource, UpdateProvider, UpdateInfo)
2. Add semver comparison utility in src/updates/version.ts
3. Add registry fetchers in src/updates/fetchers.ts (npm/PyPI/GitHub/custom)
4. Add provider registry in src/updates/providers.ts (agent-id → source/package/update-command)
5. Add orchestrating checker in src/updates/checker.ts
6. Add CLI command 'updates [id]' in src/cli/index.ts
7. Tests in test/updates/ covering all modules (TDD)
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented Agent Update Manager with TDD. Added src/updates/ module (types.ts, version.ts, fetchers.ts, providers.ts, checker.ts) and wired 'agentdots updates [id]' CLI command. 22 new tests covering version comparison, provider registry, and checker logic. All 64 tests passing.
<!-- SECTION:FINAL_SUMMARY:END -->
