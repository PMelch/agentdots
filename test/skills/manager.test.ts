import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tempDir: string;
let previousCwd: string;
let previousHome: string | undefined;

async function setup() {
  tempDir = await mkdtemp(join(tmpdir(), "agentdots-skills-manager-test-"));
  previousCwd = process.cwd();
  previousHome = process.env.HOME;
  process.env.HOME = tempDir;
  process.chdir(tempDir);
}

async function teardown() {
  process.chdir(previousCwd);
  if (previousHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = previousHome;
  }
  await rm(tempDir, { recursive: true, force: true });
}

async function writeSkill(root: string, name: string, content: string) {
  const skillDir = join(root, name);
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, "SKILL.md"), content);
}

describe("SkillsManager.loadSkills", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("returns empty array for missing directory", async () => {
    const { SkillsManager } = await import("../../dist/skills/manager.js");
    const manager = new SkillsManager(join(tempDir, "missing"));

    assert.deepEqual(await manager.loadSkills("project"), []);
  });

  it("loads skill directories and ignores files", async () => {
    const { SkillsManager } = await import("../../dist/skills/manager.js");
    const skillsDir = join(tempDir, ".agentdots", "skills");
    await writeSkill(skillsDir, "reviewer", "# Reviewer");
    await writeSkill(skillsDir, "planner", "# Planner");
    await writeFile(join(skillsDir, "README.md"), "ignore");

    const manager = new SkillsManager(skillsDir);
    const skills = await manager.loadSkills("project");

    assert.deepEqual(skills.map((skill) => skill.name).sort(), ["planner", "reviewer"]);
    assert.ok(skills.every((skill) => skill.source.endsWith(skill.name)));
  });
});

describe("SkillsManager.syncToAgent and listInstalled", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("syncs project skills to claude-code and lists installed skills", async () => {
    const { SkillsManager } = await import("../../dist/skills/manager.js");
    const skillsDir = join(tempDir, ".agentdots", "skills");
    await writeSkill(skillsDir, "reviewer", "# Reviewer");
    await writeSkill(skillsDir, "planner", "# Planner");

    const manager = new SkillsManager(skillsDir);
    const writtenPath = await manager.syncToAgent("claude-code", "project");

    assert.equal(writtenPath, join(".claude", "skills"));
    assert.equal(await readFile(join(tempDir, ".claude", "skills", "reviewer", "SKILL.md"), "utf-8"), "# Reviewer");
    assert.deepEqual(await manager.listInstalled("claude-code", "project"), ["planner", "reviewer"]);
  });

  it("removes previously managed skills that no longer exist in the source directory", async () => {
    const { SkillsManager } = await import("../../dist/skills/manager.js");
    const skillsDir = join(tempDir, ".agentdots", "skills");
    await writeSkill(skillsDir, "reviewer", "# Reviewer");

    const manager = new SkillsManager(skillsDir);
    await manager.syncToAgent("cursor", "project");

    await rm(join(skillsDir, "reviewer"), { recursive: true, force: true });
    await writeSkill(skillsDir, "planner", "# Planner");
    await manager.syncToAgent("cursor", "project");

    assert.deepEqual(await manager.listInstalled("cursor", "project"), ["planner"]);
  });

  it("throws for unsupported agents", async () => {
    const { SkillsManager } = await import("../../dist/skills/manager.js");
    const manager = new SkillsManager(join(tempDir, ".agentdots", "skills"));

    await assert.rejects(() => manager.syncToAgent("codex", "project"), /no skills mapper/i);
    await assert.rejects(() => manager.listInstalled("codex", "project"), /no skills mapper/i);
  });
});

describe("SkillsManager.diff and syncToAll", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("reports added, removed, and modified skills", async () => {
    const { SkillsManager } = await import("../../dist/skills/manager.js");
    const skillsDir = join(tempDir, ".agentdots", "skills");
    const targetDir = join(tempDir, ".roo", "skills");

    await writeSkill(skillsDir, "reviewer", "# New Reviewer");
    await writeSkill(skillsDir, "planner", "# Planner");

    await writeSkill(targetDir, "reviewer", "# Old Reviewer");
    await writeSkill(targetDir, "legacy", "# Legacy");

    const manager = new SkillsManager(skillsDir);
    const result = await manager.diff("roo-code", "project");

    assert.equal(result.hasChanges, true);
    assert.deepEqual(result.added, ["planner"]);
    assert.deepEqual(result.removed, ["legacy"]);
    assert.deepEqual(result.modified, ["reviewer"]);
  });

  it("syncs to all supported skill agents", async () => {
    const { SkillsManager } = await import("../../dist/skills/manager.js");
    const skillsDir = join(tempDir, ".agentdots", "skills");
    await writeSkill(skillsDir, "reviewer", "# Reviewer");

    const manager = new SkillsManager(skillsDir);
    const synced = await manager.syncToAll("project");

    assert.deepEqual(synced.sort(), ["claude-code", "cursor", "roo-code"]);
    assert.equal(await readFile(join(tempDir, ".cursor", "skills", "reviewer", "SKILL.md"), "utf-8"), "# Reviewer");
  });
});
