import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tempDir: string;
let previousCwd: string;

async function setup() {
  tempDir = await mkdtemp(join(tmpdir(), "agentdots-commands-test-"));
  previousCwd = process.cwd();
  process.chdir(tempDir);
}

async function teardown() {
  process.chdir(previousCwd);
  await rm(tempDir, { recursive: true, force: true });
}

describe("CommandsManager.loadCommands", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("returns empty array for missing directory", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const manager = new CommandsManager(join(tempDir, "nonexistent"));
    const commands = await manager.loadCommands("project");
    assert.deepEqual(commands, []);
  });

  it("reads .md files from directory", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const cmdDir = join(tempDir, "commands");
    await mkdir(cmdDir, { recursive: true });
    await writeFile(join(cmdDir, "review.md"), "Review this code carefully.");

    const manager = new CommandsManager(cmdDir);
    const commands = await manager.loadCommands("project");
    assert.equal(commands.length, 1);
    assert.equal(commands[0].name, "review");
    assert.equal(commands[0].content, "Review this code carefully.");
    assert.equal(commands[0].scope, "project");
  });

  it("reads multiple .md files", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const cmdDir = join(tempDir, "commands");
    await mkdir(cmdDir, { recursive: true });
    await writeFile(join(cmdDir, "review.md"), "Review code.");
    await writeFile(join(cmdDir, "explain.md"), "Explain code.");

    const manager = new CommandsManager(cmdDir);
    const commands = await manager.loadCommands("global");
    assert.equal(commands.length, 2);
    const names = commands.map((c) => c.name).sort();
    assert.deepEqual(names, ["explain", "review"]);
  });

  it("ignores non-.md files", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const cmdDir = join(tempDir, "commands");
    await mkdir(cmdDir, { recursive: true });
    await writeFile(join(cmdDir, "review.md"), "Review code.");
    await writeFile(join(cmdDir, "config.json"), "{}");
    await writeFile(join(cmdDir, "notes.txt"), "text");

    const manager = new CommandsManager(cmdDir);
    const commands = await manager.loadCommands("project");
    assert.equal(commands.length, 1);
    assert.equal(commands[0].name, "review");
  });
});

describe("CommandsManager.syncToAgent", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("throws for unknown agent", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const manager = new CommandsManager(join(tempDir, "commands"));
    await assert.rejects(() => manager.syncToAgent("unknown-agent", "project"), /no commands mapper/i);
  });

  it("throws when scope not supported by agent", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const manager = new CommandsManager(join(tempDir, "commands"));
    // cursor has no global commands path
    await assert.rejects(() => manager.syncToAgent("cursor", "global"), /does not support global/i);
  });

  it("creates target directory and writes command files", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const cmdDir = join(tempDir, "commands");
    await mkdir(cmdDir, { recursive: true });
    await writeFile(join(cmdDir, "review.md"), "Review this code.");
    await writeFile(join(cmdDir, "explain.md"), "Explain this code.");

    const manager = new CommandsManager(cmdDir);
    const targetDir = await manager.syncToAgent("claude-code", "project");

    assert.ok(targetDir.includes(".claude"));
    assert.ok(targetDir.includes("commands"));

    const reviewContent = await readFile(join(targetDir, "review.md"), "utf-8");
    assert.equal(reviewContent, "Review this code.");

    const explainContent = await readFile(join(targetDir, "explain.md"), "utf-8");
    assert.equal(explainContent, "Explain this code.");
  });
});

describe("CommandsManager.diff", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("throws for unknown agent", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const manager = new CommandsManager(join(tempDir, "commands"));
    await assert.rejects(() => manager.diff("unknown-agent", "project"), /no commands mapper/i);
  });

  it("throws when scope not supported by agent", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const manager = new CommandsManager(join(tempDir, "commands"));
    await assert.rejects(() => manager.diff("cursor", "global"), /does not support global/i);
  });

  it("reports all commands as added when agent dir is empty", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const cmdDir = join(tempDir, "commands");
    await mkdir(cmdDir, { recursive: true });
    await writeFile(join(cmdDir, "review.md"), "Review code.");

    const manager = new CommandsManager(cmdDir);
    const result = await manager.diff("claude-code", "project");
    assert.equal(result.hasChanges, true);
    assert.deepEqual(result.added, ["review"]);
    assert.deepEqual(result.removed, []);
    assert.deepEqual(result.modified, []);
  });

  it("reports no changes when content matches", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const cmdDir = join(tempDir, "commands");
    await mkdir(cmdDir, { recursive: true });
    await writeFile(join(cmdDir, "review.md"), "Review code.");

    const manager = new CommandsManager(cmdDir);
    // Sync first
    await manager.syncToAgent("claude-code", "project");
    // Then diff
    const result = await manager.diff("claude-code", "project");
    assert.equal(result.hasChanges, false);
    assert.deepEqual(result.added, []);
    assert.deepEqual(result.removed, []);
    assert.deepEqual(result.modified, []);
  });

  it("detects modified commands", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const cmdDir = join(tempDir, "commands");
    await mkdir(cmdDir, { recursive: true });
    await writeFile(join(cmdDir, "review.md"), "Original content.");

    const manager = new CommandsManager(cmdDir);
    await manager.syncToAgent("claude-code", "project");

    // Update source command
    await writeFile(join(cmdDir, "review.md"), "Updated content.");

    const result = await manager.diff("claude-code", "project");
    assert.equal(result.hasChanges, true);
    assert.deepEqual(result.modified, ["review"]);
  });

  it("detects removed commands", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const cmdDir = join(tempDir, "commands");
    await mkdir(cmdDir, { recursive: true });
    await writeFile(join(cmdDir, "review.md"), "Review code.");

    const manager = new CommandsManager(cmdDir);
    await manager.syncToAgent("claude-code", "project");

    // Remove the source command (now agent has more than source)
    const { rm: rmFile } = await import("node:fs/promises");
    await rmFile(join(cmdDir, "review.md"));

    const result = await manager.diff("claude-code", "project");
    assert.equal(result.hasChanges, true);
    assert.deepEqual(result.removed, ["review"]);
  });
});

describe("CommandsManager.syncToAll", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("returns empty array when no commands", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const cmdDir = join(tempDir, "commands");
    await mkdir(cmdDir, { recursive: true });

    const manager = new CommandsManager(cmdDir);
    const synced = await manager.syncToAll("project");
    // claude-code and cursor both support project scope
    assert.equal(synced.length, 2);
  });

  it("syncs to all supported agents", async () => {
    const { CommandsManager } = await import("../../dist/commands/manager.js");
    const cmdDir = join(tempDir, "commands");
    await mkdir(cmdDir, { recursive: true });
    await writeFile(join(cmdDir, "explain.md"), "Explain the code.");

    const manager = new CommandsManager(cmdDir);
    const synced = await manager.syncToAll("project");
    assert.ok(synced.includes("claude-code"));
    assert.ok(synced.includes("cursor"));
  });
});
