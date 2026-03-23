import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { executeUpdates } from "../../src/updates/executor.js";
import type { UpdateInfo } from "../../src/updates/types.js";

function makeResult(agentId: string, opts: Partial<UpdateInfo> = {}): UpdateInfo {
  return {
    agentId,
    agentName: agentId,
    currentVersion: "1.0.0",
    latestVersion: "1.1.0",
    hasUpdate: true,
    updateCommand: `echo updated-${agentId}`,
    ...opts,
  };
}

describe("executeUpdates", () => {
  it("skips agents that have no update available", async () => {
    const results = [makeResult("aider", { hasUpdate: false, updateCommand: "pip install --upgrade aider-chat" })];
    const executed: string[] = [];
    const report = await executeUpdates(results, {
      yes: true,
      runCommand: async (cmd) => { executed.push(cmd); return true; },
      confirm: async () => true,
    });
    assert.equal(executed.length, 0);
    assert.equal(report[0].skipped, true);
    assert.ok(report[0].skipReason?.includes("no update"));
  });

  it("skips agents without an updateCommand", async () => {
    const results = [makeResult("cursor", { updateCommand: undefined })];
    const executed: string[] = [];
    const report = await executeUpdates(results, {
      yes: true,
      runCommand: async (cmd) => { executed.push(cmd); return true; },
      confirm: async () => true,
    });
    assert.equal(executed.length, 0);
    assert.equal(report[0].skipped, true);
    assert.ok(report[0].skipReason?.includes("no update command"));
  });

  it("runs all update commands without prompting when yes=true", async () => {
    const results = [makeResult("claude-code"), makeResult("aider")];
    const executed: string[] = [];
    const confirmed: string[] = [];
    const report = await executeUpdates(results, {
      yes: true,
      runCommand: async (cmd) => { executed.push(cmd); return true; },
      confirm: async (q) => { confirmed.push(q); return true; },
    });
    assert.equal(executed.length, 2);
    assert.equal(confirmed.length, 0);
    assert.equal(report[0].success, true);
    assert.equal(report[1].success, true);
  });

  it("prompts for each update when yes=false and runs on confirm", async () => {
    const results = [makeResult("claude-code")];
    const executed: string[] = [];
    let prompted = false;
    const report = await executeUpdates(results, {
      yes: false,
      runCommand: async (cmd) => { executed.push(cmd); return true; },
      confirm: async () => { prompted = true; return true; },
    });
    assert.equal(prompted, true);
    assert.equal(executed.length, 1);
    assert.equal(report[0].success, true);
  });

  it("skips execution when user declines confirmation", async () => {
    const results = [makeResult("claude-code")];
    const executed: string[] = [];
    const report = await executeUpdates(results, {
      yes: false,
      runCommand: async (cmd) => { executed.push(cmd); return true; },
      confirm: async () => false,
    });
    assert.equal(executed.length, 0);
    assert.equal(report[0].skipped, true);
    assert.ok(report[0].skipReason?.includes("declined"));
  });

  it("records failure when runCommand returns false", async () => {
    const results = [makeResult("aider")];
    const report = await executeUpdates(results, {
      yes: true,
      runCommand: async () => false,
      confirm: async () => true,
    });
    assert.equal(report[0].success, false);
    assert.equal(report[0].skipped, false);
  });

  it("handles mixed results: one updated, one declined, one skipped", async () => {
    const results = [
      makeResult("claude-code"),
      makeResult("aider"),
      makeResult("cursor", { updateCommand: undefined }),
    ];
    let callCount = 0;
    const report = await executeUpdates(results, {
      yes: false,
      runCommand: async () => true,
      confirm: async () => { callCount++; return callCount === 1; }, // first yes, second no
    });
    assert.equal(report[0].success, true);
    assert.equal(report[1].skipped, true);
    assert.equal(report[2].skipped, true);
  });
});
