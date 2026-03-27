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
    assert.equal(getMapper("codex")?.agentId, "codex");
    assert.equal(getMapper("gemini")?.agentId, "gemini");
    assert.equal(getMapper("cursor")?.agentId, "cursor");
    assert.equal(getMapper("copilot")?.agentId, "copilot");
    assert.equal(getMapper("opencode")?.agentId, "opencode");
    assert.equal(getMapper("pi")?.agentId, "pi");
    assert.equal(getMapper("windsurf")?.agentId, "windsurf");
    assert.equal(getMapper("cline")?.agentId, "cline");
    assert.equal(getMapper("roo-code")?.agentId, "roo-code");
    assert.equal(getMapper("aider"), undefined);
    assert.equal(getMapper("zed"), undefined);
    assert.equal(getAllMappers().length, 10);
  });

  it("resolves project and global skills paths", async () => {
    const {
      claudeCodeMapper,
      codexMapper,
      geminiMapper,
      cursorMapper,
      copilotMapper,
      opencodeMapper,
      piMapper,
      windsurfMapper,
      clineMapper,
      rooCodeMapper,
    } = await import("../../dist/skills/mappers.js");

    assert.equal(claudeCodeMapper.skillsPath("project"), join(".claude", "skills"));
    assert.equal(codexMapper.skillsPath("project"), join(".agents", "skills"));
    assert.equal(geminiMapper.skillsPath("project"), join(".gemini", "skills"));
    assert.equal(cursorMapper.skillsPath("project"), join(".cursor", "skills"));
    assert.equal(copilotMapper.skillsPath("project"), join(".github", "skills"));
    assert.equal(opencodeMapper.skillsPath("project"), join(".opencode", "skills"));
    assert.equal(piMapper.skillsPath("project"), join(".pi", "skills"));
    assert.equal(windsurfMapper.skillsPath("project"), join(".windsurf", "skills"));
    assert.equal(clineMapper.skillsPath("project"), join(".cline", "skills"));
    assert.equal(rooCodeMapper.skillsPath("project"), join(".roo", "skills"));

    assert.ok(isAbsolute(claudeCodeMapper.skillsPath("global")));
    assert.ok(isAbsolute(codexMapper.skillsPath("global")));
    assert.ok(isAbsolute(geminiMapper.skillsPath("global")));
    assert.ok(isAbsolute(cursorMapper.skillsPath("global")));
    assert.ok(isAbsolute(copilotMapper.skillsPath("global")));
    assert.ok(isAbsolute(opencodeMapper.skillsPath("global")));
    assert.ok(isAbsolute(piMapper.skillsPath("global")));
    assert.ok(isAbsolute(windsurfMapper.skillsPath("global")));
    assert.ok(isAbsolute(clineMapper.skillsPath("global")));
    assert.ok(isAbsolute(rooCodeMapper.skillsPath("global")));
    assert.ok(claudeCodeMapper.skillsPath("global").endsWith(join(".claude", "skills")));
    assert.ok(codexMapper.skillsPath("global").endsWith(join(".agents", "skills")));
    assert.ok(geminiMapper.skillsPath("global").endsWith(join(".gemini", "skills")));
    assert.ok(cursorMapper.skillsPath("global").endsWith(join(".cursor", "skills")));
    assert.ok(copilotMapper.skillsPath("global").endsWith(join(".copilot", "skills")));
    assert.ok(opencodeMapper.skillsPath("global").endsWith(join(".config", "opencode", "skills")));
    assert.ok(piMapper.skillsPath("global").endsWith(join(".pi", "agent", "skills")));
    assert.ok(windsurfMapper.skillsPath("global").endsWith(join(".codeium", "windsurf", "skills")));
    assert.ok(clineMapper.skillsPath("global").endsWith(join(".cline", "skills")));
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
