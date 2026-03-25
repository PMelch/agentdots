import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tempDir: string;
let previousCwd: string;
let previousHome: string | undefined;

async function setup() {
  tempDir = await mkdtemp(join(tmpdir(), "agentdots-marketplace-test-"));
  previousCwd = process.cwd();
  previousHome = process.env.HOME;
  process.env.HOME = tempDir;
  process.chdir(tempDir);
}

async function teardown() {
  process.chdir(previousCwd);
  if (previousHome === undefined) delete process.env.HOME;
  else process.env.HOME = previousHome;
  await rm(tempDir, { recursive: true, force: true });
}

describe("inferSkillName", () => {
  it("extracts repo name from URL", async () => {
    const { inferSkillName } = await import("../../dist/marketplace/installer.js");
    assert.equal(inferSkillName("https://github.com/user/my-skill"), "my-skill");
  });

  it("strips .git suffix", async () => {
    const { inferSkillName } = await import("../../dist/marketplace/installer.js");
    assert.equal(inferSkillName("https://github.com/user/my-skill.git"), "my-skill");
  });

  it("uses last segment of subpath when provided", async () => {
    const { inferSkillName } = await import("../../dist/marketplace/installer.js");
    assert.equal(inferSkillName("https://github.com/user/repo", "skills/tdd"), "tdd");
  });
});

describe("copySkillDir", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("copies files recursively to target dir", async () => {
    const { copySkillDir } = await import("../../dist/marketplace/installer.js");
    const sourceDir = join(tempDir, "source");
    const targetDir = join(tempDir, "target");
    await mkdir(sourceDir, { recursive: true });
    await writeFile(join(sourceDir, "SKILL.md"), "# Test Skill");

    const destDir = await copySkillDir(sourceDir, targetDir, "my-skill");

    assert.equal(destDir, join(targetDir, "my-skill"));
    const content = await readFile(join(destDir, "SKILL.md"), "utf-8");
    assert.equal(content, "# Test Skill");
  });

  it("creates target directory if missing", async () => {
    const { copySkillDir } = await import("../../dist/marketplace/installer.js");
    const sourceDir = join(tempDir, "src2");
    const targetDir = join(tempDir, "deeply", "nested", "target");
    await mkdir(sourceDir, { recursive: true });
    await writeFile(join(sourceDir, "SKILL.md"), "# Nested");

    await copySkillDir(sourceDir, targetDir, "skill");

    const content = await readFile(join(targetDir, "skill", "SKILL.md"), "utf-8");
    assert.equal(content, "# Nested");
  });
});

describe("installFromGit", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("clones repo and copies to targetDir", async () => {
    const { installFromGit } = await import("../../dist/marketplace/installer.js");
    const targetDir = join(tempDir, "skills");

    let clonedUrl: string | undefined;
    const mockClone = async (url: string, cloneDir: string) => {
      clonedUrl = url;
      await mkdir(cloneDir, { recursive: true });
      await writeFile(join(cloneDir, "SKILL.md"), "# Cloned Skill");
    };

    const destDir = await installFromGit(
      "https://github.com/user/test-skill",
      { targetDir },
      mockClone
    );

    assert.equal(clonedUrl, "https://github.com/user/test-skill");
    const content = await readFile(join(destDir, "SKILL.md"), "utf-8");
    assert.equal(content, "# Cloned Skill");
  });

  it("extracts subdirectory when path is specified", async () => {
    const { installFromGit } = await import("../../dist/marketplace/installer.js");
    const targetDir = join(tempDir, "skills");

    const mockClone = async (_url: string, cloneDir: string) => {
      const subDir = join(cloneDir, "skills", "tdd");
      await mkdir(subDir, { recursive: true });
      await writeFile(join(subDir, "SKILL.md"), "# TDD Skill");
    };

    await installFromGit(
      "https://github.com/user/repo",
      { targetDir, path: "skills/tdd" },
      mockClone
    );

    const content = await readFile(join(targetDir, "tdd", "SKILL.md"), "utf-8");
    assert.equal(content, "# TDD Skill");
  });

  it("cleans up temp dir after copy", async () => {
    const { installFromGit } = await import("../../dist/marketplace/installer.js");
    const targetDir = join(tempDir, "skills");

    let cloneDir: string | undefined;
    const mockClone = async (_url: string, dir: string) => {
      cloneDir = dir;
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "SKILL.md"), "# Skill");
    };

    await installFromGit("https://github.com/user/skill", { targetDir }, mockClone);

    if (cloneDir) {
      await assert.rejects(() => stat(cloneDir!), { code: "ENOENT" });
    }
  });

  it("uses explicit skillName option", async () => {
    const { installFromGit } = await import("../../dist/marketplace/installer.js");
    const targetDir = join(tempDir, "skills");

    const mockClone = async (_url: string, cloneDir: string) => {
      await mkdir(cloneDir, { recursive: true });
      await writeFile(join(cloneDir, "SKILL.md"), "# Named");
    };

    await installFromGit(
      "https://github.com/user/repo",
      { targetDir, skillName: "custom-name" },
      mockClone
    );

    const content = await readFile(join(targetDir, "custom-name", "SKILL.md"), "utf-8");
    assert.equal(content, "# Named");
  });
});

describe("uninstall", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("removes global skill directory", async () => {
    const { uninstall } = await import("../../dist/marketplace/installer.js");
    const skillDir = join(tempDir, ".agentdots", "skills", "my-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), "# My Skill");

    await uninstall("my-skill", "global");

    await assert.rejects(() => stat(skillDir), { code: "ENOENT" });
  });

  it("removes project skill directory", async () => {
    const { uninstall } = await import("../../dist/marketplace/installer.js");
    const skillDir = join(tempDir, ".agentdots", "skills", "proj-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), "# Proj Skill");

    await uninstall("proj-skill", "project");

    await assert.rejects(() => stat(skillDir), { code: "ENOENT" });
  });

  it("does not error if skill does not exist", async () => {
    const { uninstall } = await import("../../dist/marketplace/installer.js");
    await assert.doesNotReject(() => uninstall("nonexistent", "global"));
  });
});
