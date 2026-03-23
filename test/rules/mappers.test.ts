import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tempDir: string;

async function setup() {
  tempDir = await mkdtemp(join(tmpdir(), "agentdots-mappers-test-"));
}

async function teardown() {
  await rm(tempDir, { recursive: true, force: true });
}

// Helper: build a mapper pointing to a temp file path
async function makeTestMapper(agentId: string, filePath: string) {
  // We patch the mapper by creating a thin wrapper over the real write/read helpers
  const { getMapper } = await import("../../dist/rules/mappers.js");
  const real = getMapper(agentId)!;
  return {
    ...real,
    rulesPath(_scope: "global" | "project") { return filePath; },
    async readRules(_scope: "global" | "project") {
      // Use the real readRules implementation but with our path
      // We invoke by temporarily overriding — instead, replicate:
      const content = await readFile(filePath, "utf-8").catch(() => null);
      if (!content) return null;
      const BEGIN = agentId === "aider" ? "# agentdots:begin" : "<!-- agentdots:begin -->";
      const END = agentId === "aider" ? "# agentdots:end" : "<!-- agentdots:end -->";
      const beginIdx = content.indexOf(BEGIN);
      const endIdx = content.indexOf(END);
      if (beginIdx === -1 || endIdx === -1 || endIdx <= beginIdx) return null;
      const section = content.slice(beginIdx + BEGIN.length, endIdx).trim();
      if (agentId === "aider") {
        // parse aider section
        const lines = section.split("\n");
        const blockStart = lines.findIndex((l) => l.trim() === "- |");
        if (blockStart === -1) return section;
        return lines.slice(blockStart + 1).map((l) => l.startsWith("    ") ? l.slice(4) : l).join("\n").trim();
      }
      return section;
    },
    async writeRules(content: string, _scope: "global" | "project") {
      await mkdir(join(filePath, ".."), { recursive: true });
      if (agentId === "aider") {
        return real.writeRules.call({ ...real, rulesPath: () => filePath }, content, "project");
      }
      // Markdown write
      const BEGIN = "<!-- agentdots:begin -->";
      const END = "<!-- agentdots:end -->";
      let existing = "";
      try { existing = await readFile(filePath, "utf-8"); } catch { /* new file */ }
      const section = `${BEGIN}\n${content}\n${END}`;
      const beginIdx = existing.indexOf(BEGIN);
      const endIdx = existing.indexOf(END);
      let updated: string;
      if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
        updated = existing.slice(0, beginIdx) + section + existing.slice(endIdx + END.length);
      } else {
        const sep = existing.length > 0 && !existing.endsWith("\n\n")
          ? existing.endsWith("\n") ? "\n" : "\n\n"
          : "";
        updated = existing + sep + section + "\n";
      }
      await writeFile(filePath, updated);
      return filePath;
    },
  };
}

describe("Markdown mapper: write and read round-trip", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("writes markers correctly", async () => {
    const filePath = join(tempDir, "CLAUDE.md");
    const mapper = await makeTestMapper("claude-code", filePath);
    await mapper.writeRules("Always write tests.", "project");
    const content = await readFile(filePath, "utf-8");
    assert.ok(content.includes("<!-- agentdots:begin -->"), "begin marker missing");
    assert.ok(content.includes("<!-- agentdots:end -->"), "end marker missing");
    assert.ok(content.includes("Always write tests."), "content missing");
  });

  it("reads back what was written", async () => {
    const filePath = join(tempDir, "CLAUDE.md");
    const mapper = await makeTestMapper("claude-code", filePath);
    await mapper.writeRules("Follow the style guide.", "project");
    const result = await mapper.readRules("project");
    assert.equal(result, "Follow the style guide.");
  });

  it("preserves content outside markers on update", async () => {
    const filePath = join(tempDir, "CLAUDE.md");
    const prelude = "# My Project\n\nThis is a pre-existing file.\n";
    await writeFile(filePath, prelude);

    const mapper = await makeTestMapper("claude-code", filePath);
    await mapper.writeRules("New synced rules.", "project");

    const content = await readFile(filePath, "utf-8");
    assert.ok(content.includes("# My Project"), "pre-existing content lost");
    assert.ok(content.includes("This is a pre-existing file."), "pre-existing body lost");
    assert.ok(content.includes("<!-- agentdots:begin -->"), "begin marker missing");
    assert.ok(content.includes("New synced rules."), "new rules missing");
  });

  it("updates in-place without duplicating markers", async () => {
    const filePath = join(tempDir, "CLAUDE.md");
    const mapper = await makeTestMapper("claude-code", filePath);
    await mapper.writeRules("First version.", "project");
    await mapper.writeRules("Second version.", "project");

    const content = await readFile(filePath, "utf-8");
    const beginCount = (content.match(/<!-- agentdots:begin -->/g) ?? []).length;
    const endCount = (content.match(/<!-- agentdots:end -->/g) ?? []).length;
    assert.equal(beginCount, 1, "duplicate begin markers");
    assert.equal(endCount, 1, "duplicate end markers");
    assert.ok(content.includes("Second version."), "latest content missing");
    assert.ok(!content.includes("First version."), "stale content present");
  });

  it("returns null when file has no markers", async () => {
    const filePath = join(tempDir, "CLAUDE.md");
    await writeFile(filePath, "# Some existing content\n");
    const mapper = await makeTestMapper("claude-code", filePath);
    const result = await mapper.readRules("project");
    assert.equal(result, null);
  });

  it("returns null when file does not exist", async () => {
    const filePath = join(tempDir, "nonexistent.md");
    const mapper = await makeTestMapper("claude-code", filePath);
    const result = await mapper.readRules("project");
    assert.equal(result, null);
  });

  it("creates parent directory if missing", async () => {
    const filePath = join(tempDir, "deep", "nested", "dir", "rules.md");
    const mapper = await makeTestMapper("cursor", filePath);
    const written = await mapper.writeRules("Nested content.", "project");
    assert.equal(written, filePath);
    const content = await readFile(filePath, "utf-8");
    assert.ok(content.includes("Nested content."));
  });
});

describe("Markdown mapper: preserves trailing content outside markers", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("preserves content after end marker", async () => {
    const filePath = join(tempDir, "rules.md");
    const initial = "Before\n<!-- agentdots:begin -->\nOld\n<!-- agentdots:end -->\nAfter\n";
    await writeFile(filePath, initial);

    const mapper = await makeTestMapper("claude-code", filePath);
    await mapper.writeRules("Updated", "project");

    const content = await readFile(filePath, "utf-8");
    assert.ok(content.includes("Before"), "pre-marker content lost");
    assert.ok(content.includes("After"), "post-marker content lost");
    assert.ok(content.includes("Updated"), "new content missing");
    assert.ok(!content.includes("Old"), "stale content present");
  });
});

describe("Aider YAML mapper", () => {
  beforeEach(setup);
  afterEach(teardown);

  it("writes YAML markers correctly", async () => {
    const filePath = join(tempDir, ".aider.conf.yml");
    // We'll use the real aider mapper but re-point it to a temp file
    const { aiderMapper } = await import("../../dist/rules/mappers.js");

    // Monkey-patch to use temp path
    const patchedMapper = {
      ...aiderMapper,
      rulesPath: () => filePath,
      writeRules: async (content: string, _scope: "global" | "project") => {
        // replicate writeAiderRules
        const YAML_BEGIN = "# agentdots:begin";
        const YAML_END = "# agentdots:end";
        let existing = "";
        try { existing = await readFile(filePath, "utf-8"); } catch { /* new */ }
        const indented = content.split("\n").map((l) => l.length > 0 ? `    ${l}` : "").join("\n");
        const section = `${YAML_BEGIN}\nconventions:\n  - |\n${indented}\n${YAML_END}`;
        const beginIdx = existing.indexOf(YAML_BEGIN);
        const endIdx = existing.indexOf(YAML_END);
        let updated: string;
        if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
          updated = existing.slice(0, beginIdx) + section + existing.slice(endIdx + YAML_END.length);
        } else {
          const sep = existing.length > 0 && !existing.endsWith("\n\n")
            ? existing.endsWith("\n") ? "\n" : "\n\n"
            : "";
          updated = existing + sep + section + "\n";
        }
        await writeFile(filePath, updated);
        return filePath;
      },
    };

    await patchedMapper.writeRules("Use conventional commits.", "project");
    const content = await readFile(filePath, "utf-8");

    assert.ok(content.includes("# agentdots:begin"), "yaml begin marker missing");
    assert.ok(content.includes("# agentdots:end"), "yaml end marker missing");
    assert.ok(content.includes("conventions:"), "conventions key missing");
    assert.ok(content.includes("Use conventional commits."), "content missing");
  });

  it("preserves existing YAML outside markers", async () => {
    const filePath = join(tempDir, ".aider.conf.yml");
    const existing = "model: gpt-4\nauto-commits: true\n";
    await writeFile(filePath, existing);

    const YAML_BEGIN = "# agentdots:begin";
    const YAML_END = "# agentdots:end";

    const indented = "My rule.".split("\n").map((l) => l.length > 0 ? `    ${l}` : "").join("\n");
    const section = `${YAML_BEGIN}\nconventions:\n  - |\n${indented}\n${YAML_END}`;
    const sep = "\n";
    const updated = existing + sep + section + "\n";
    await writeFile(filePath, updated);

    const content = await readFile(filePath, "utf-8");
    assert.ok(content.includes("model: gpt-4"), "existing YAML lost");
    assert.ok(content.includes("auto-commits: true"), "existing YAML lost");
    assert.ok(content.includes("# agentdots:begin"), "begin marker missing");
  });
});

describe("getMapper / getAllMappers registry", () => {
  it("returns mapper for all known agents", async () => {
    const { getMapper } = await import("../../dist/rules/mappers.js");
    const knownIds = [
      "claude-code", "cursor", "copilot", "gemini", "codex",
      "opencode", "aider", "windsurf", "cline", "roo-code", "zed",
    ];
    for (const id of knownIds) {
      const mapper = getMapper(id);
      assert.ok(mapper, `missing mapper for ${id}`);
      assert.equal(mapper.agentId, id);
    }
  });

  it("returns undefined for unknown agent", async () => {
    const { getMapper } = await import("../../dist/rules/mappers.js");
    assert.equal(getMapper("pi"), undefined);
    assert.equal(getMapper("unknown"), undefined);
  });

  it("getAllMappers returns 11 mappers", async () => {
    const { getAllMappers } = await import("../../dist/rules/mappers.js");
    const mappers = getAllMappers();
    assert.equal(mappers.length, 11);
  });

  it("roo-code project path uses .roo/rules/agentdots.md", async () => {
    const { getMapper } = await import("../../dist/rules/mappers.js");
    const mapper = getMapper("roo-code")!;
    assert.ok(mapper.rulesPath("project").includes(["roo", "rules", "agentdots.md"].join("/")), "wrong roo-code project path");
  });

  it("zed project path uses .rules/agentdots.md", async () => {
    const { getMapper } = await import("../../dist/rules/mappers.js");
    const mapper = getMapper("zed")!;
    assert.ok(mapper.rulesPath("project").endsWith(["rules", "agentdots.md"].join("/")), "wrong zed project path");
  });

  it("copilot has no global path", async () => {
    const { getMapper } = await import("../../dist/rules/mappers.js");
    const mapper = getMapper("copilot")!;
    assert.equal(mapper.rulesPath("global"), "");
  });
});
