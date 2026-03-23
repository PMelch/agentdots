import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";

let tempDir: string;
let previousCwd: string;
let previousHome: string | undefined;

async function setup() {
  tempDir = await mkdtemp(join(tmpdir(), "agentdots-skills-mapper-test-"));
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

describe("skills mappers", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("returns mapper registry for supported agents", async () => {
    const { getMapper, getAllMappers } = await import("../../dist/skills/mappers.js");

    assert.equal(getMapper("claude-code")?.agentId, "claude-code");
    assert.equal(getMapper("cursor")?.agentId, "cursor");
    assert.equal(getMapper("roo-code")?.agentId, "roo-code");
    assert.equal(getMapper("codex"), undefined);
    assert.equal(getAllMappers().length, 3);
  });

  it("resolves project and global skills paths", async () => {
    const { claudeCodeMapper, cursorMapper, rooCodeMapper } = await import("../../dist/skills/mappers.js");

    assert.equal(claudeCodeMapper.skillsPath("project"), join(".claude", "skills"));
    assert.equal(cursorMapper.skillsPath("project"), join(".cursor", "skills"));
    assert.equal(rooCodeMapper.skillsPath("project"), join(".roo", "skills"));

    assert.ok(isAbsolute(claudeCodeMapper.skillsPath("global")));
    assert.ok(isAbsolute(cursorMapper.skillsPath("global")));
    assert.ok(isAbsolute(rooCodeMapper.skillsPath("global")));
    assert.ok(claudeCodeMapper.skillsPath("global").endsWith(join(".claude", "skills")));
    assert.ok(cursorMapper.skillsPath("global").endsWith(join(".cursor", "skills")));
    assert.ok(rooCodeMapper.skillsPath("global").endsWith(join(".roo", "skills")));
  });

  it("copies a skill directory recursively to the agent destination", async () => {
    const { syncSkillsDirectory } = await import("../../dist/skills/mappers.js");
    const sourceDir = join(tempDir, "source", "reviewer");
    const targetDir = join(tempDir, "target");

    await mkdir(join(sourceDir, "docs"), { recursive: true });
    await writeFile(join(sourceDir, "SKILL.md"), "# Reviewer");
    await writeFile(join(sourceDir, "docs", "notes.txt"), "nested");

    await syncSkillsDirectory(sourceDir, join(targetDir, "reviewer"));

    assert.equal(await readFile(join(targetDir, "reviewer", "SKILL.md"), "utf-8"), "# Reviewer");
    assert.equal(await readFile(join(targetDir, "reviewer", "docs", "notes.txt"), "utf-8"), "nested");
  });
});
