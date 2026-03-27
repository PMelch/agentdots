import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
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

  it("parses frontmatter description and metadata from SKILL.md", async () => {
    const { SkillsManager } = await import("../../dist/skills/manager.js");
    const skillsDir = join(tempDir, ".agentdots", "skills");
    await writeSkill(
      skillsDir,
      "reviewer",
      `---
name: reviewer
description: Reviews pull requests and flags regressions.
license: MIT
metadata:
  author: QA Team
  version: "1.0"
tags:
  - review
  - qa
---
# Reviewer`,
    );

    const manager = new SkillsManager(skillsDir);
    const [skill] = await manager.loadSkills("project");

    assert.equal(skill.description, "Reviews pull requests and flags regressions.");
    assert.deepEqual(skill.metadata, [
      { key: "license", value: "MIT" },
      { key: "author", value: "QA Team" },
      { key: "version", value: "1.0" },
      { key: "tags", value: "review, qa" },
    ]);
  });

  it("detects skills when the skill directory is a symlink", async () => {
    const { SkillsManager } = await import("../../dist/skills/manager.js");
    const skillsDir = join(tempDir, ".agentdots", "skills");
    const externalSkillsDir = join(tempDir, "linked-skills");
    await writeSkill(externalSkillsDir, "reviewer", "# Reviewer");
    await mkdir(skillsDir, { recursive: true });
    await symlink(join(externalSkillsDir, "reviewer"), join(skillsDir, "reviewer"), "dir");

    const manager = new SkillsManager(skillsDir);
    const skills = await manager.loadSkills("project");

    assert.deepEqual(skills.map((skill) => skill.name), ["reviewer"]);
    assert.equal(await readFile(join(skills[0].path, "SKILL.md"), "utf-8"), "# Reviewer");
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

    await assert.rejects(() => manager.syncToAgent("aider", "project"), /no skills mapper/i);
    await assert.rejects(() => manager.listInstalled("zed", "project"), /no skills mapper/i);
  });

  it("lists installed skills when the agent skill directory entry is a symlink", async () => {
    const { SkillsManager } = await import("../../dist/skills/manager.js");
    const targetRoot = join(tempDir, ".claude", "skills");
    const externalSkillsDir = join(tempDir, "linked-installed-skills");
    await writeSkill(externalSkillsDir, "reviewer", "# Reviewer");
    await mkdir(targetRoot, { recursive: true });
    await symlink(join(externalSkillsDir, "reviewer"), join(targetRoot, "reviewer"), "dir");

    const manager = new SkillsManager(join(tempDir, ".agentdots", "skills"));

    assert.deepEqual(await manager.listInstalled("claude-code", "project"), ["reviewer"]);
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

  it("treats changes inside symlinked subdirectories as modifications", async () => {
    const { SkillsManager } = await import("../../dist/skills/manager.js");
    const skillsDir = join(tempDir, ".agentdots", "skills");
    const targetDir = join(tempDir, ".roo", "skills");
    const sourceLinkedDocs = join(tempDir, "source-linked-docs");
    const installedLinkedDocs = join(tempDir, "installed-linked-docs");

    await mkdir(sourceLinkedDocs, { recursive: true });
    await mkdir(installedLinkedDocs, { recursive: true });
    await writeFile(join(sourceLinkedDocs, "notes.txt"), "source notes");
    await writeFile(join(installedLinkedDocs, "notes.txt"), "installed notes");

    await writeSkill(skillsDir, "reviewer", "# Reviewer");
    await symlink(sourceLinkedDocs, join(skillsDir, "reviewer", "docs"), "dir");

    await writeSkill(targetDir, "reviewer", "# Reviewer");
    await symlink(installedLinkedDocs, join(targetDir, "reviewer", "docs"), "dir");

    const manager = new SkillsManager(skillsDir);
    const result = await manager.diff("roo-code", "project");

    assert.deepEqual(result.modified, ["reviewer"]);
  });

  it("syncs to all supported skill agents", async () => {
    const { SkillsManager } = await import("../../dist/skills/manager.js");
    const skillsDir = join(tempDir, ".agentdots", "skills");
    await writeSkill(skillsDir, "reviewer", "# Reviewer");

    const manager = new SkillsManager(skillsDir);
    const synced = await manager.syncToAll("project");

    assert.deepEqual(synced.sort(), [
      "claude-code",
      "cline",
      "codex",
      "copilot",
      "cursor",
      "gemini",
      "opencode",
      "pi",
      "roo-code",
      "windsurf",
    ]);
    assert.equal(await readFile(join(tempDir, ".cursor", "skills", "reviewer", "SKILL.md"), "utf-8"), "# Reviewer");
    assert.equal(await readFile(join(tempDir, ".agents", "skills", "reviewer", "SKILL.md"), "utf-8"), "# Reviewer");
    assert.equal(await readFile(join(tempDir, ".gemini", "skills", "reviewer", "SKILL.md"), "utf-8"), "# Reviewer");
    assert.equal(await readFile(join(tempDir, ".github", "skills", "reviewer", "SKILL.md"), "utf-8"), "# Reviewer");
    assert.equal(await readFile(join(tempDir, ".opencode", "skills", "reviewer", "SKILL.md"), "utf-8"), "# Reviewer");
    assert.equal(await readFile(join(tempDir, ".pi", "skills", "reviewer", "SKILL.md"), "utf-8"), "# Reviewer");
    assert.equal(await readFile(join(tempDir, ".windsurf", "skills", "reviewer", "SKILL.md"), "utf-8"), "# Reviewer");
    assert.equal(await readFile(join(tempDir, ".cline", "skills", "reviewer", "SKILL.md"), "utf-8"), "# Reviewer");
  });
});
